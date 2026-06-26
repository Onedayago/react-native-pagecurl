// ═══════════════════════════════════════════════════════════════
//  默认配置
// ═══════════════════════════════════════════════════════════════
import {Platform} from "react-native";
/**
 * 组件默认属性配置
 * @property {number} width - 组件宽度（像素），同时作为纹理宽度
 * @property {number} height - 组件高度（像素），同时作为纹理高度
 * @property {number} curlRadius - 翻页卷曲半径（像素），控制翻页时纸张卷曲的弧度大小
 * @property {number} edgeMargin - 边缘触发区域宽度（像素），距边缘多少像素内可触发翻页
 * @property {number} minDragDist - 最小拖拽距离（像素），拖拽距离低于此值不触发翻页
 * @property {number} cols - 网格列数，值越大翻页效果越平滑，但性能开销越大
 * @property {number} rows - 网格行数，值越大翻页效果越平滑，但性能开销越大
 * @property {number} bodyPaddingX - 正文左右内边距（像素）
 */
export const DEFAULT_PROPS = {
	width: 300,
	height: 300,
	curlRadius: 30,
	edgeMargin: 100,
	minDragDist: 3,
	cols: 50,
	rows: 50,
	bodyPaddingX: 50,
};

/**
 * 默认字体配置
 * @property {string} fontFamily - 字体族名称，如 "PingFang SC"、"Arial" 等
 * @property {number} titleFontSize - 标题字号（像素）
 * @property {number} authorFontSize - 作者名字号（像素）
 * @property {number} bodyFontSize - 正文字号（像素）
 * @property {number} pageNumFontSize - 页码字号（像素）
 */
export const DEFAULT_FONT = {
	fontFamily: Platform.OS === 'ios'?"PingFang SC":"sans-serif",
	titleFontSize: 24,
	authorFontSize: 22,
	bodyFontSize: 16,
	pageNumFontSize: 16,
};

/**
 * 默认颜色配置
 * @property {string} pageBg - 页面背景色（纸张颜色）
 * @property {string} outerBorder - 外边框颜色
 * @property {string} innerBorder - 内边框颜色
 * @property {string} title - 标题文字颜色
 * @property {string} author - 作者名文字颜色
 * @property {string} body - 正文文字颜色
 * @property {string} pageNum - 页码文字颜色
 * @property {string} divider - 分隔线颜色（标题与正文之间的横线）
 * @property {string} containerBg - 容器背景色（页面外围区域颜色）
 */
export const DEFAULT_COLORS = {
	pageBg: "#FFFDF5",
	outerBorder: "#C8B896",
	innerBorder: "#DDD0B0",
	title: "#1a1a1a",
	author: "#999999",
	body: "#333333",
	pageNum: "#BBBBBB",
	divider: "#D4C5A0",
	containerBg: "#2c2c3a",
};