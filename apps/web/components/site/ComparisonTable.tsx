import styles from "@/app/compare/compare.module.css";

export type ComparisonRow = { feature: string; zeno: string; competitor: string };

export function ComparisonTable({ competitorName, rows }: { competitorName: string; rows: ComparisonRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Feature</th>
          <th scope="col">Zeno</th>
          <th scope="col">{competitorName}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.feature}>
            <th scope="row">{row.feature}</th>
            <td className={styles.zenoCol}>{row.zeno}</td>
            <td>{row.competitor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
