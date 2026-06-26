// ═══════════════════════════════════════════════════════════════
//  几何工具
// ═══════════════════════════════════════════════════════════════

/**
 * 计算过点 (cx,cy) 沿方向向量 (nx,ny) 的无限直线与矩形页面四条边的交点
 *
 * 该函数用于翻页效果中确定折叠线与页面边界的交点位置，
 * 交点用于确定页面被折叠部分的边界。
 *
 * @param {number} cx - 直线上一点的 x 坐标（当前拖拽点）
 * @param {number} cy - 直线上一点的 y 坐标（当前拖拽点）
 * @param {number} nx - 直线方向向量的 x 分量（法线方向）
 * @param {number} ny - 直线方向向量的 y 分量（法线方向）
 * @param {number} pageW - 页面宽度
 * @param {number} pageH - 页面高度
 * @returns {Array<{x: number, y: number, edge: string}>} 交点数组，每个交点包含坐标和所在边（"left"/"right"/"top"/"bottom"）
 */
export function lineRectIntersections(cx, cy, nx, ny, pageW, pageH) {
	"worklet"; // 标记为 worklet，可在 UI 线程中运行以提升性能
	const result = [];
	// 矩形边界：Left=0, Right=pageW, Top=0, Bottom=pageH
	const L = 0, R = pageW, T = 0, B = pageH;

	// 计算与左右边（x=L 和 x=R）的交点
	if (Math.abs(nx) > 1e-6) {
		// 与左边 (x=0) 的交点：参数方程 t = (L - cx) / nx
		let t = (L - cx) / nx;
		let y = cy + ny * t;
		if (y >= T && y <= B) result.push({ x: L, y, edge: "left" });
		// 与右边 (x=pageW) 的交点
		t = (R - cx) / nx;
		y = cy + ny * t;
		if (y >= T && y <= B) result.push({ x: R, y, edge: "right" });
	}
	return result;
}

/**
 * 构建三角形索引数组，用于 Skia Vertices 组件的索引渲染
 *
 * 将网格的每个单元格拆分为两个三角形（共 6 个顶点索引），
 * 用于 GPU 加速的纹理映射渲染。
 *
 * 索引顺序决定三角形的绘制顺序，通过 reverseRows/reverseCols 控制
 * 绘制方向，确保翻页时近处的页面先绘制（在底层），远处的后绘制（在上层），
 * 实现正确的遮挡关系。
 *
 * @param {number} rows - 网格行数
 * @param {number} cols - 网格列数
 * @param {boolean} reverseRows - 是否反转行绘制顺序（从下往上绘制）
 * @param {boolean} reverseCols - 是否反转列绘制顺序（从右往左绘制）
 * @returns {number[]} 三角形索引数组，每 6 个索引构成一个单元格的两个三角形
 */
export function buildIndices(rows, cols, reverseRows, reverseCols) {
	const out = [];
	for (let ri = 0; ri < rows; ri++) {
		// 根据 reverseRows 决定实际行号
		const r = reverseRows ? (rows - 1 - ri) : ri;
		for (let ci = 0; ci < cols; ci++) {
			// 根据 reverseCols 决定实际列号
			const c = reverseCols ? (cols - 1 - ci) : ci;
			// 计算当前单元格四个顶点在顶点数组中的索引
			// 顶点布局: tl(top-left), tr(top-right), bl(bottom-left), br(bottom-right)
			const tl = r * (cols + 1) + c;      // 左上角
			const tr = tl + 1;                    // 右上角
			const bl = tl + (cols + 1);           // 左下角
			const br = bl + 1;                    // 右下角
			// 两个三角形：(tl,tr,bl) 和 (tr,br,bl)
			out.push(tl, tr, bl, tr, br, bl);
		}
	}
	return out;
}