Switches between 2–4 peer views — e.g. Week / Month / Year, or All / Active / Paused.

```jsx
<SegmentedControl
  options={["Month", "Quarter", "Year"]}
  value={range} onChange={setRange}
/>
```

- Controlled. Keep labels short; for >4 options use tabs or a select instead.
