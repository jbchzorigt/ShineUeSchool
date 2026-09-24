/* USD формат: 120000 → "$120,000" (en-US). Server/client хоёуланд ижил гаралт → hydration зөрчилгүй. */
const fmt = new Intl.NumberFormat("en-US");
export const formatUsd = (n: number) => `$${fmt.format(n)}`;
export const gradeRange = (from: number, to: number) => (from === to ? `${from}-р анги` : `${from}–${to}-р анги`);
