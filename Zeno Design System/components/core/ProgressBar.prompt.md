Shows budget usage or any value-against-max. Colors itself: green → amber (≥75%) → red (≥100%).

```jsx
<ProgressBar value={spent} max={budget} showLabel label="Entertainment" />
```

- Let the auto-color signal budget health; only override `color` for neutral/decorative bars.
