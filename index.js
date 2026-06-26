import React, { useEffect, useState, useMemo } from "react";
import {
	Canvas, Vertices, ImageShader, Fill,
} from "@shopify/react-native-skia";
import { GestureHandlerRootView, GestureDetector } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";

import { DEFAULT_PROPS, DEFAULT_FONT, DEFAULT_COLORS } from "./constants";
import { buildTextPage } from "./textRenderer";
import { useBaseTextures, useIndexCache, useCurlGesture } from "./useCurlGesture";

// ═══════════════════════════════════════════════════════════════
//  组件
// ═══════════════════════════════════════════════════════════════

/**
 * PageCurlBook 组件 - 翻页效果书本组件
 *
 * 实现了一个具有真实翻页效果的书本阅读器，支持从四个边缘触发翻页。
 * 使用 Skia 进行高性能 GPU 渲染，通过网格变形模拟纸张卷曲效果。
 *
 * 渲染流程：
 * 1. 使用 Skia 离屏渲染书页纹理（包含标题、作者、正文、页码等）
 * 2. 将纹理作为 ImageShader 应用到 Vertices 组件
 * 3. 通过手势控制网格顶点的变形，实现翻页动画
 * 4. 网格变形基于圆柱面映射数学模型，模拟真实纸张卷曲
 *
 * @param {object} props - 组件属性
 * @param {string} [props.text] - 正文内容
 * @param {string} [props.title] - 标题文本
 * @param {string} [props.author] - 作者名
 * @param {string} [props.pageNum] - 页码文本
 * @param {number} [props.width=300] - 组件宽度（像素）
 * @param {number} [props.height=300] - 组件高度（像素）
 * @param {number} [props.curlRadius=20] - 卷曲半径（像素）
 * @param {number} [props.edgeMargin=50] - 边缘触发区域宽度（像素）
 * @param {number} [props.minDragDist=3] - 最小拖拽距离（像素）
 * @param {number} [props.cols=25] - 网格列数
 * @param {number} [props.rows=25] - 网格行数
 * @param {number} [props.bodyPaddingX=50] - 正文左右内边距（像素）
 * @param {object} [props.font] - 字体配置，覆盖默认字体设置
 * @param {object} [props.colors] - 颜色配置，覆盖默认颜色设置
 * @param {function} [props.onPageFlip] - 翻页成功回调，参数 direction: 1=下一页(向左翻), -1=上一页(向右翻)
 */
const PageCurlBook = (props) => {
	// 合并默认属性与用户传入的属性
	const {
		text,
		title,
		author,
		pageNum,
		width,        height,
		curlRadius,
		edgeMargin,   minDragDist,
		cols,         rows,
		bodyPaddingX,
		font:   fontProp,
		colors: colorProp,
		onPageFlip,
	} = { ...DEFAULT_PROPS, ...props };

	// 合并字体和颜色配置，通过 JSON 序列化稳定依赖，避免父组件传新对象导致无效重渲染
	const fontKey = JSON.stringify(fontProp);
	const colorKey = JSON.stringify(colorProp);
	const fc = useMemo(() => ({ ...DEFAULT_FONT, ...fontProp }), [fontKey]);
	const cc = useMemo(() => ({ ...DEFAULT_COLORS, ...colorProp }), [colorKey]);

	// ── 离屏纹理：预先渲染书页内容为位图纹理 ──
	const [pageImage, setPageImage] = useState(null);
	useEffect(() => {
		setPageImage(
			buildTextPage({
				width, height, text, title, author, pageNum,
				font: fc, colors: cc, bodyPaddingX,
			})
		);
	}, [width, height, text, title, author, pageNum, fc, cc, bodyPaddingX]);

	// ── 静态数据：纹理坐标和索引缓存（不随手势变化）──
	const baseTextures = useBaseTextures(rows, cols, width, height); // UV 纹理坐标
	const idxCache     = useIndexCache(rows, cols);            // 4 种方向的索引缓存

	// ── 手势 + 几何：处理拖拽手势并计算顶点变形 ──
	const { pan, verts, dynamicIndices } = useCurlGesture({
		width, height, curlRadius, edgeMargin,
		minDragDist, cols, rows, idxCache, onPageFlip,
	});

	// ── 渲染 ──
	return (
		<GestureHandlerRootView style={{ width, height }}>
			<GestureDetector gesture={pan}>
				<View style={styles.fill}>
					<Canvas style={{ width, height }}>
						{/* 背景填充 */}
						<Fill color={cc.containerBg} />

						{/* 书页网格渲染：使用 Vertices 实现纹理映射变形 */}
						{pageImage && (
							<Vertices
								vertices={verts}           // 变形后的顶点坐标
								textures={baseTextures}    // 原始纹理坐标（UV）
								indices={dynamicIndices}   // 动态三角形索引
							>
								{/* ImageShader 将书页纹理映射到网格上 */}
								<ImageShader image={pageImage} fit="fill" />
							</Vertices>
						)}
					</Canvas>
				</View>
			</GestureDetector>
		</GestureHandlerRootView>
	);
};

/** 样式定义 */
const styles = StyleSheet.create({
	fill: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default PageCurlBook;