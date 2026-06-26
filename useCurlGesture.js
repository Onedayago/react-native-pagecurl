import { useMemo } from "react";
import { useDerivedValue, useSharedValue, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { buildIndices, lineRectIntersections } from "./geometry";


// ═══════════════════════════════════════════════════════════════
//  纹理坐标（静态）
// ═══════════════════════════════════════════════════════════════

/**
 * 生成网格顶点的纹理坐标（UV 坐标）
 *
 * 纹理坐标用于将离屏渲染的书页纹理映射到网格顶点上。
 * 坐标范围为 [0, width] × [0, height]，对应纹理上的像素位置。
 *
 * @param {number} rows - 网格行数
 * @param {number} cols - 网格列数
 * @param {number} width - 纹理宽度（像素）
 * @param {number} height - 纹理高度（像素）
 * @returns {Array<{x: number, y: number}>} 纹理坐标数组，长度为 (rows+1)*(cols+1)
 */
export function useBaseTextures(rows, cols, width, height) {
	return useMemo(() => {
		const arr = [];
		for (let r = 0; r <= rows; r++) {
			for (let c = 0; c <= cols; c++) {
				arr.push({
					x: (c / cols) * width,
					y: (r / rows) * height,
				});
			}
		}
		return arr;
	}, [rows, cols, width, height]);
}

// ═══════════════════════════════════════════════════════════════
//  索引缓存（4 种方向）
// ═══════════════════════════════════════════════════════════════

/**
 * 预计算 4 种翻页方向的三角形索引缓存
 *
 * 翻页方向不同会导致绘制顺序不同，为了实现正确的遮挡关系，
 * 需要预先计算 4 种方向的索引数组：
 * - n:  正常顺序（无反转）
 * - rr: 反转行（从下往上绘制，用于向上翻页）
 * - cr: 反转列（从右往左绘制，用于向左翻页）
 * - br: 双向反转（行和列都反转，用于对角翻页）
 *
 * @param {number} rows - 网格行数
 * @param {number} cols - 网格列数
 * @returns {object} 包含 4 种索引数组的对象 { n, rr, cr, br }
 */
export function useIndexCache(rows, cols) {
	return useMemo(() => ({
		n:  buildIndices(rows, cols, false, false), // 正常顺序
		rr: buildIndices(rows, cols, true, false),  // 反转行
		cr: buildIndices(rows, cols, false, true),  // 反转列
		br: buildIndices(rows, cols, true, true),   // 双向反转
	}), [rows, cols]);
}

// ═══════════════════════════════════════════════════════════════
//  手势 + 几何（返回所有 shared / derived value）
// ═══════════════════════════════════════════════════════════════

// 默认几何对象（valid=0 表示无有效手势），放在组件外避免每次渲染创建新引用
const defaultGeo = {
	valid: 0, cx: 0, cy: 0,
	curlDirX: 0, curlDirY: 0,
	foldDirX: 0, foldDirY: 0,
};

/**
 * 翻页手势处理 Hook
 *
 * 核心逻辑：
 * 1. 检测用户从页面边缘开始的拖拽手势
 * 2. 计算折叠线的方向和位置
 * 3. 根据折叠线位置对网格顶点进行变形，模拟纸张卷曲效果
 * 4. 返回手势、顶点、索引等数据供渲染组件使用
 *
 * 翻页数学模型：
 * - 将页面视为一张可弯曲的纸，拖拽点定义了折叠线的位置
 * - 折叠线将页面分为"已翻"和"未翻"两部分
 * - 已翻部分的顶点被映射到圆柱面上（模拟卷曲效果）
 * - 超过半圆周的顶点被反射到另一侧（完成翻页）
 *
 * @param {object} config - 配置参数
 * @param {number} config.width - 页面宽度（像素）
 * @param {number} config.height - 页面高度（像素）
 * @param {number} config.curlRadius - 卷曲半径（像素）
 * @param {number} config.edgeMargin - 边缘触发区域宽度（像素）
 * @param {number} config.minDragDist - 最小拖拽距离（像素）
 * @param {number} config.cols - 网格列数
 * @param {number} config.rows - 网格行数
 * @param {object} config.idxCache - 预计算的索引缓存（来自 useIndexCache）
 * @param {function} [config.onPageFlip] - 翻页成功回调，参数 direction: 1=下一页, -1=上一页
 * @returns {object} 包含手势、顶点、索引的对象
 */
export function useCurlGesture(config) {
	const {
		width, height, curlRadius, edgeMargin,
		minDragDist, cols, rows, idxCache,
		onPageFlip,
	} = config;

	// 半圆周长度 = π × 半径，用于判断顶点是否超过半圆（完成翻页）
	const halfCirc = Math.PI * curlRadius;

	// ── Shared Values：用于在 UI 线程中存储手势状态 ──
	const startX = useSharedValue(0);   // 拖拽起点 X 坐标
	const startY = useSharedValue(0);   // 拖拽起点 Y 坐标
	const curX   = useSharedValue(0);   // 当前拖拽点 X 坐标
	const curY   = useSharedValue(0);   // 当前拖拽点 Y 坐标
	const lastX  = useSharedValue(0);   // 上一次有效拖拽点 X 坐标（用于回退）
	const lastY  = useSharedValue(0);   // 上一次有效拖拽点 Y 坐标（用于回退）
	const dragging = useSharedValue(0); // 是否正在拖拽（0=未拖拽，1=拖拽中）
	const edge     = useSharedValue(-1); // 触发边缘方向索引：0=left,1=right,2=top,3=bottom, -1=none

	// ── 手势识别器 ──
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.onStart((e) => {
					// 仅检测左右边缘: 0=left, 1=right, -1=none
					let ed = -1;
					if (e.x < edgeMargin)              ed = 0;
					else if (e.x > width - edgeMargin)  ed = 1;

					if (ed >= 0) {
						startX.value = e.x; startY.value = e.y;
						curX.value = e.x;   curY.value = e.y;
						lastX.value = e.x;  lastY.value = e.y;
						dragging.value = 1; edge.value = ed;
					} else {
						dragging.value = 0;
					}
				})
				.onUpdate((e) => {
					if (!dragging.value) return;

					let nx = e.x, ny = e.y;
					const ed = edge.value;

					// 只允许水平方向拖拽
					if (ed === 1) nx = Math.min(nx, startX.value);
					if (ed === 0) nx = Math.max(nx, startX.value);

					const dx = nx - startX.value;
					const dy = ny - startY.value;
					const d = Math.sqrt(dx * dx + dy * dy);
					if (d < minDragDist) return;

					const nnx = -dy / d;  //折线的方向
					const nny = dx / d;
					const pts = lineRectIntersections(nx, ny, nnx, nny, width, height);

					const blocked =
						(ed === 1 && pts.some((p) => p.edge === "left")) ||
						(ed === 0 && pts.some((p) => p.edge === "right"));

					if (blocked) {
						curX.value = lastX.value;
						curY.value = lastY.value;
					} else {
						curX.value = nx; curY.value = ny;
						lastX.value = nx; lastY.value = ny;
					}
				})
				.onEnd(() => {
					if (!dragging.value) return;

					const ed = edge.value;
					const cx = curX.value;
					const dx = cx - startX.value;
					const passed = Math.abs(dx) >= width / 2;

					const targetX = passed
						? (ed === 0 ? startX.value + width : startX.value - width)
						: startX.value;

					curX.value = withTiming(targetX, { duration: 300 }, () => {
						dragging.value = 0;
						edge.value = -1;
						curX.value = startX.value;
						curY.value = startY.value;
						if (passed && onPageFlip) {
							runOnJS(onPageFlip)(ed === 0 ? -1 : 1);
						}
					});
					curY.value = withTiming(startY.value, { duration: 300 });
				}),
		[edgeMargin, width, height, minDragDist, onPageFlip],
	);

	// ── 几何参数：由拖拽点计算折叠线的方向向量 ──
	const geo = useDerivedValue(() => {
		if (!dragging.value) return defaultGeo;
		const cx = curX.value, cy = curY.value;
		const dx = cx - startX.value, dy = cy - startY.value;
		const d = Math.sqrt(dx * dx + dy * dy);
		if (d < minDragDist) return defaultGeo;
		

		return {
			valid: 1,
			cx, cy, // 折叠线上的点（当前拖拽位置）
			// curlDir: 卷曲方向（从拖拽点指向起始点的单位向量）
			// 纸张将沿此方向卷起
			curlDirX: -dx / d, curlDirY: -dy / d,
			// foldDir: 折叠线方向（垂直于 curlDir 的单位向量）
			// 折叠线沿此方向延伸
			foldDirX:  dy / d, foldDirY: -dx / d,
		};
	});

	// ── 动态索引：根据翻页方向选择正确的绘制顺序 ──
	const dynamicIndices = useDerivedValue(() => {
		const g = geo.value;
		if (!g.valid) return idxCache.n; // 未翻页时使用正常顺序
		// 根据卷曲方向确定是否需要反转行/列
		const r = g.curlDirY < 0; // Y 分量为负表示向上翻页，需要反转行
		const c = g.curlDirX < 0; // X 分量为负表示向左翻页，需要反转列
		if (r && c) return idxCache.br; // 双向反转
		if (r)      return idxCache.rr; // 反转行
		if (c)      return idxCache.cr; // 反转列
		return idxCache.n;              // 正常顺序
	});

	// ── 顶点变形：翻页效果的核心数学计算 ──
	const verts = useDerivedValue(() => {
		const g = geo.value;
		const out = [];
		for (let r = 0; r <= rows; r++) {
			for (let c = 0; c <= cols; c++) {
				const ox = (c / cols) * width;
				const oy = (r / rows) * height;
				if (!g.valid) { out.push({ x: ox, y: oy }); continue; }

				const rx = ox - g.cx;
				const ry = oy - g.cy;
				const along = rx * g.curlDirX + ry * g.curlDirY;
				const perp  = rx * g.foldDirX  + ry * g.foldDirY;

				if (along > halfCirc) {
					const ex = along - halfCirc;
					out.push({
						x: g.cx - g.curlDirX * ex + g.foldDirX * perp,
						y: g.cy - g.curlDirY * ex + g.foldDirY * perp,
					});
				} else if (along > 0) {
					const s = Math.sin(along / curlRadius);
					out.push({
						x: g.cx + g.curlDirX * curlRadius * s + g.foldDirX * perp,
						y: g.cy + g.curlDirY * curlRadius * s + g.foldDirY * perp,
					});
				} else {
					out.push({ x: ox, y: oy });
				}
			}
		}
		return out;
	});

	return { pan, verts, dynamicIndices };
}