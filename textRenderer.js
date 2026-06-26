import { Skia, matchFont } from "@shopify/react-native-skia";
import { DEFAULT_FONT, DEFAULT_COLORS } from "./constants";

// ═══════════════════════════════════════════════════════════════
//  自动折行
// ═══════════════════════════════════════════════════════════════

/**
 * 文本自动折行函数
 *
 * 将长文本按照指定的最大宽度进行折行处理，支持多段落（以换行符分隔）。
 * 逐字符测量宽度，当当前行超过最大宽度时自动换行。
 *
 * @param {string} text - 需要折行的原始文本
 * @param {object} font - Skia 字体对象，用于测量文字宽度
 * @param {number} maxWidth - 每行的最大宽度（像素）
 * @returns {string[]} 折行后的文本行数组
 */
function wrapText(text, font, maxWidth) {
	const result = [];
	// 按换行符分割段落
	const paragraphs = text.split("\n");

	for (const para of paragraphs) {
		// 空段落保留为空行
		if (para.trim() === "") {
			result.push("");
			continue;
		}

		let line = "";
		for (let i = 0; i < para.length; i++) {
			const ch = para[i];
			const test = line + ch;
			// 优先使用 font.getTextWidth 精确测量，否则使用估算值
			// 估算公式：字符数 × 字号 × 0.55（中文字符宽度系数）
			const w = font.getTextWidth ? font.getTextWidth(test) : 0;
			const estimated = w > 0
				? w
				: test.length * (font.getSize() || 28) * 0.55;

			// 当前行超过最大宽度且不为空时，将当前行推入结果，新行从当前字符开始
			if (estimated > maxWidth && line.length > 0) {
				result.push(line);
				line = ch;
			} else {
				line = test;
			}
		}
		// 推入最后一行
		if (line) result.push(line);
	}

	return result;
}

// ═══════════════════════════════════════════════════════════════
//  离屏渲染文字页面
// ═══════════════════════════════════════════════════════════════

/**
 * 离屏渲染文字页面纹理
 *
 * 使用 Skia 在离屏 Canvas 上绘制一页书页的内容，包括：
 * - 纸张背景
 * - 外边框和内边框装饰
 * - 标题（居中显示）
 * - 作者名（居中显示）
 * - 分隔线
 * - 正文内容（自动折行）
 * - 页码（底部居中）
 *
 * 生成的纹理将作为翻页效果的输入，通过 UV 映射到网格上实现翻页变形。
 *
 * @param {object} options - 渲染配置选项
 * @param {number} [options.width=300] - 纹理宽度（像素）
 * @param {number} [options.height=300] - 纹理高度（像素）
 * @param {string} [options.text=""] - 正文内容
 * @param {string} [options.title] - 标题文本
 * @param {string} [options.author] - 作者名
 * @param {string} [options.pageNum] - 页码文本
 * @param {object} [options.font={}] - 字体配置，覆盖默认字体设置
 * @param {object} [options.colors={}] - 颜色配置，覆盖默认颜色设置
 * @param {number} [options.bodyPaddingX=50] - 正文左右内边距（像素）
 * @returns {object|null} Skia Image 对象，可用于 ImageShader；失败时返回 null
 */
export function buildTextPage(options) {
	const {
		width = 300,
		height = 300,
		text = "",
		title,
		author,
		pageNum,
		font: fontCfg = {},
		colors: colorCfg = {},
		bodyPaddingX = 50,
	} = options;

	const fc = { ...DEFAULT_FONT, ...fontCfg };
	const cc = { ...DEFAULT_COLORS, ...colorCfg };

	const surface = Skia.Surface.MakeOffscreen(width, height);
	if (!surface) return null;
	const cv = surface.getCanvas();

	// ── 纸张背景 ──
	const bg = Skia.Paint();
	bg.setColor(Skia.Color(cc.pageBg));
	cv.drawRect(Skia.XYWHRect(0, 0, width, height), bg);

	// ── 外边框 ──
	const op = Skia.Paint();
	op.setStyle(1);
	op.setStrokeWidth(2);
	op.setColor(Skia.Color(cc.outerBorder));
	cv.drawRect(Skia.XYWHRect(18, 18, width - 36, height - 36), op);

	// ── 内边框 ──
	const ip = Skia.Paint();
	ip.setStyle(1);
	ip.setStrokeWidth(0.6);
	ip.setColor(Skia.Color(cc.innerBorder));
	cv.drawRect(Skia.XYWHRect(28, 28, width - 56, height - 56), ip);

	// ── 字体工厂函数 ──
	const makeFont = (size, bold) =>
		matchFont({
			fontFamily: fc.fontFamily,
			fontSize: size,
			...(bold ? { fontWeight: "bold" } : {}),
		});

	const titleFont  = makeFont(fc.titleFontSize, true);
	const authorFont = makeFont(fc.authorFontSize);
	const bodyFont   = makeFont(fc.bodyFontSize);
	const numFont    = makeFont(fc.pageNumFontSize);

	// 复用 Paint 对象，减少分配
	const paintText = Skia.Paint();
	const paintLine = Skia.Paint();
	paintLine.setStrokeWidth(1);

	let curY = 0;

	// ── 绘制标题 ──
	if (title) {
		paintText.setColor(Skia.Color(cc.title));
		const tw = title.length * fc.titleFontSize * 0.55;
		const tx = Math.max(bodyPaddingX, (width - tw) / 2);
		curY = 100;
		cv.drawText(title, tx, curY, paintText, titleFont);
		curY += fc.titleFontSize + 8;
	}

	// ── 绘制作者名 ──
	if (author) {
		paintText.setColor(Skia.Color(cc.author));
		const aw = author.length * fc.authorFontSize * 0.55;
		const ax = Math.max(bodyPaddingX, (width - aw) / 2);
		curY += 6;
		cv.drawText(author, ax, curY, paintText, authorFont);
		curY += fc.authorFontSize + 10;
	}

	// ── 绘制分隔线 ──
	if (title || author) {
		curY += 6;
		paintLine.setColor(Skia.Color(cc.divider));
		cv.drawLine(bodyPaddingX, curY, width - bodyPaddingX, curY, paintLine);
		curY += 18;
	} else {
		curY = 60;
	}

	// ── 绘制正文 ──
	const maxTextW = width - bodyPaddingX * 2;
	const lines = wrapText(text, bodyFont, maxTextW);
	const lineSpacing = fc.bodyFontSize * 1.6;
	paintText.setColor(Skia.Color(cc.body));

	for (const line of lines) {
		if (curY + fc.bodyFontSize > height - 60) break;
		if (line === "") {
			curY += lineSpacing * 0.5;
		} else {
			cv.drawText(line, bodyPaddingX, curY, paintText, bodyFont);
			curY += lineSpacing;
		}
	}

	// ── 绘制页码 ──
	if (pageNum) {
		paintText.setColor(Skia.Color(cc.pageNum));
		const nw = pageNum.length * fc.pageNumFontSize * 0.55;
		cv.drawText(pageNum, (width - nw) / 2, height - 46, paintText, numFont);
	}

	// ── 导出为 Image 对象，释放 Surface ──
	surface.flush();
	const img = surface.makeImageSnapshot();
	console.log(img);
	surface.dispose();
	return img.makeNonTextureImage();
}