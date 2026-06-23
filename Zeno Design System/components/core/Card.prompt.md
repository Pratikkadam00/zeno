The base surface for everything in Zeno — content sits on cards, cards sit on the warm paper background.

```jsx
<Card padding="md">…</Card>
<Card interactive onClick={open}>…</Card>
```

- Resting elevation is a hairline border + `--shadow-xs`. Reserve `--shadow-md`/lift for interactive cards on hover.
- Radius is always `--radius-lg` (16px). Don't stack a card inside a card with the same shadow — use `padding="none"` + dividers for nested lists.
