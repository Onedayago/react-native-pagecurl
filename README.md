<img width="216" height="468" alt="Adobe Express - RPReplay_Final1782457197" src="https://github.com/user-attachments/assets/eb9533b9-c21e-4eff-8fee-082b0ef162ea" />

# react-native-pagecurl


React Native 翻页效果组件，基于 Skia GPU 渲染 + Reanimated 手势驱动，支持从左右边缘拖拽翻页，松手时超过半页自动完成翻页动画。
## 源码地址 https://github.com/Onedayago/react-native-pagecurl
## 依赖

```bash
npm install @shopify/react-native-skia react-native-gesture-handler react-native-reanimated
```

## 基本用法

```jsx
import PageCurlBook from "react-native-pagecurl";

function App() {
  return (
    <PageCurlBook
      width={350}
      height={500}
      title="静夜思"
      author="李白"
      text="床前明月光，疑是地上霜。\n举头望明月，低头思故乡。"
      pageNum="1"
      onPageFlip={(direction) => {
        if (direction === 1) console.log("下一页");
        else console.log("上一页");
      }}
    />
  );
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `width` | `number` | `300` | 组件宽度（像素） |
| `height` | `number` | `300` | 组件高度（像素） |
| `text` | `string` | `""` | 正文内容，支持 `\n` 换行 |
| `title` | `string` | - | 标题文本 |
| `author` | `string` | - | 作者名 |
| `pageNum` | `string` | - | 页码文本 |
| `curlRadius` | `number` | `20` | 卷曲半径，值越大弧度越平缓 |
| `edgeMargin` | `number` | `50` | 边缘触发区域宽度（像素） |
| `minDragDist` | `number` | `3` | 最小拖拽距离，低于此值不触发翻页 |
| `cols` | `number` | `25` | 网格列数，越大越平滑，性能开销越大 |
| `rows` | `number` | `25` | 网格行数，越大越平滑，性能开销越大 |
| `bodyPaddingX` | `number` | `50` | 正文左右内边距（像素） |
| `font` | `object` | - | 字体配置，见下方 |
| `colors` | `object` | - | 颜色配置，见下方 |
| `onPageFlip` | `(direction: number) => void` | - | 翻页成功回调，`1` = 下一页，`-1` = 上一页 |

## 字体配置

```jsx
<PageCurlBook
  font={{
    fontFamily: "PingFang SC",
    titleFontSize: 24,
    authorFontSize: 22,
    bodyFontSize: 16,
    pageNumFontSize: 16,
  }}
/>
```

## 颜色配置

```jsx
<PageCurlBook
  colors={{
    pageBg: "#FFFDF5",       // 纸张背景色
    outerBorder: "#C8B896",  // 外边框
    innerBorder: "#DDD0B0",  // 内边框
    title: "#1a1a1a",        // 标题颜色
    author: "#999999",       // 作者颜色
    body: "#333333",         // 正文颜色
    pageNum: "#BBBBBB",      // 页码颜色
    divider: "#D4C5A0",      // 分隔线颜色
    containerBg: "#2c2c3a",  // 容器背景色
  }}
/>
```

## 翻页交互

- 从页面**左边缘**向右拖 → 上一页 (`direction = -1`)
- 从页面**右边缘**向左拖 → 下一页 (`direction = 1`)
- 拖拽超过页面一半松手 → 自动完成翻页动画并触发 `onPageFlip`
- 拖拽未超过一半松手 → 页面弹回原位
