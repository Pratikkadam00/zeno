The hero money number — monthly total, budget remaining, a single price. Always mono + tabular.

```jsx
<AmountDisplay amount={142.97} size="xl" />
<AmountDisplay amount={15.99} cadence="mo" size="md" />
<AmountDisplay amount={142.97} trend="up" trendValue="8%" />
```

- Cents render smaller and lighter so the dollars read first. `trend="up"` = spending rose, shown in red.
