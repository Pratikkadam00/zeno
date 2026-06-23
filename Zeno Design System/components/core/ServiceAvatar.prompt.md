The brand tile that fronts every subscription in Zeno. Falls back to a colored initial when no logo is available.

```jsx
<ServiceAvatar name="Netflix" />
<ServiceAvatar name="Spotify" src="/logos/spotify.png" />
```

- Color is derived from the name so the same service always gets the same tile. Override with `color` for known brands.
