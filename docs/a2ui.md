# A2UI 1.0 接入说明

杀戮尖塔 2 的卡片不是普通 React 组件直出，而是由官方 A2UI React renderer 渲染的 **A2UI 1.0 surface**。

## 协议与目录

| 项目 | 值 |
| --- | --- |
| 协议版本 | `1.0` |
| 渲染器 | `@a2ui/react@0.15.0` + `@a2ui/web_core@0.15.0` |
| Catalog ID | `https://agent.cornhub.art/a2ui/catalogs/sts2/v1/catalog.json` |
| Catalog 文档 | [`public/a2ui/catalogs/sts2/v1/catalog.json`](../public/a2ui/catalogs/sts2/v1/catalog.json) |
| 代码实现 | [`src/services/a2ui/catalog.tsx`](../src/services/a2ui/catalog.tsx) |

目录只注册固定组件，模型不能输出 HTML、CSS 或目录外的组件：

- `Sts2ProfileCard`
- `Sts2CardsCard`
- `Sts2RelicsCard`
- `Sts2RunCard`
- `Sts2OverviewCard`

每个组件都有三个属性：

- `level`：绑定到数据模型 `/level`，取值为 `1 | 2 | 3`
- `data`：STS2 工具返回的原始数据
- `actions`：可选的 A2UI `Action` 列表，渲染为卡片底部按钮

## 消息流

```text
sts2_query 工具结果
        │
        ▼
buildSts2SurfaceMessages()          src/services/a2ui/messages.ts
        │  createSurface (version 1.0, catalogId, components, dataModel)
        ▼
MessageProcessor<ReactCatalogComponent>   @a2ui/web_core
        │
        ▼
<A2uiSurface surface={surface} />   @a2ui/react
        │
        ▼
Sts2*Card 自定义组件 → 现有 Sts2CardView
```

卡片数据由工具返回，前端确定性编译，不经过模型生成，因此不会出现模型编造数值的问题。模型仍然决定是否在正文里输出 `[[sts2-card:<id>]]`；只有输出了标记，卡片才会出现。

## 数据绑定与层级切换

`level` 在 `createSurface` 的 `dataModel` 中初始化为工具推断的层级，组件属性使用：

```json
{ "level": { "@path": "/level" } }
```

右上角的「简介 / 标准 / 详细」通过 A2UI 生成的 `setLevel` 写回 `/level`，只更新本地数据模型并重新渲染组件，不会触发模型请求。

## 动作回传

卡片底部按钮是标准 A2UI `Action`：

```json
{
  "id": "analyze-run",
  "label": "分析这局",
  "action": {
    "event": {
      "name": "sts2.analyze_run",
      "context": { "run_id": 13664469 }
    }
  }
}
```

`MessageProcessor` 的 action listener 收到 `ActionPayload` 后，由
[`src/services/a2ui/actions.ts`](../src/services/a2ui/actions.ts) 把它适配成一条真实用户消息，再走现有聊天流。当前传输层只接受文本，所以这是 A2UI 的 transport adapter；动作名和上下文仍由卡片决定，模型不能伪造。

## 增加一个新组件

1. 在 `src/services/a2ui/catalog.tsx` 用 `createComponentImplementation` 注册组件，并用 Zod 定义属性。
2. 在 `public/a2ui/catalogs/sts2/v1/catalog.json` 增加同名 schema。
3. 在 `src/services/a2ui/messages.ts` 的 `templateComponent` 中映射模板。
4. 运行 `pnpm type` 和 `pnpm build`。

自定义组件只能使用目录里声明的属性；A2UI 的 `MessageProcessor` 会在渲染前校验消息和组件树。

## 与生成式 UI 的边界

当前是 **确定性编译**：工具结果决定内容，协议决定渲染。这样最稳，也保留了 A2UI 的 surface、data model、action 和 catalog 能力。

如果以后要让模型自己组合组件，可以接 `@a2ui/agent` 生成 A2UI Express / 组件树，再把消息交给同一个 `MessageProcessor`。现有渲染层不需要改。
