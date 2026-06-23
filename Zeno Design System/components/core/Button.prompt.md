Primary tappable action — use for the single most important action in a view (primary), supporting actions (secondary/ghost), or destructive ones (danger).

```jsx
<Button variant="primary" size="lg" fullWidth onClick={save}>Add subscription</Button>
<Button variant="secondary" leftIcon={<Icon name="plus" />}>New budget</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

- One primary per view. Green primary uses **dark ink text** — that's the Zeno look, never white-on-green.
- Sizes: `lg` for full-width mobile CTAs, `md` default, `sm` for inline/toolbar.
- Pair with `IconButton` for icon-only actions.
