The fundamental list line — one subscription, one payment, one setting.

```jsx
<ListRow
  leading={<ServiceAvatar name="Netflix" />}
  title="Netflix"
  subtitle="Entertainment · renews Jun 28"
  amount="$15.99" cadence="mo"
  chevron onClick={openDetail}
/>
```

- Put rows inside a `<Card padding="none">` with `divider` on all but the last for a clean grouped list.
