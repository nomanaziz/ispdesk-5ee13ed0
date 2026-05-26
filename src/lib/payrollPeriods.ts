// Auto-generate payroll periods for different period types.
// All dates are ISO yyyy-mm-dd strings.

export type PeriodType =
  | "Monthly"
  | "Weekly"
  | "Daily"
  | "Quarterly"
  | "Annual"
  | "Bi_Annual"
  | "Tri_Annual"
  | "One_Time";

export interface GeneratedPeriod {
  period_name: string;
  start_date: string;
  end_date: string;
  issue_date: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const yy = (year: number) => String(year).slice(-2);

export function generatePeriods(type: PeriodType, year: number = new Date().getFullYear()): GeneratedPeriod[] {
  const out: GeneratedPeriod[] = [];

  if (type === "Monthly") {
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m, lastDayOfMonth(year, m));
      const issue = addDays(end, 1);
      out.push({
        period_name: `${MONTHS[m]}-${yy(year)}`,
        start_date: iso(start),
        end_date: iso(end),
        issue_date: iso(issue),
      });
    }
  } else if (type === "Weekly") {
    for (let m = 0; m < 12; m++) {
      const lastDay = lastDayOfMonth(year, m);
      let day = 1;
      while (day <= lastDay) {
        const chunkEnd = Math.min(day + 6, lastDay);
        // If remaining after this chunk is < 7 days, merge it into current chunk
        const remaining = lastDay - chunkEnd;
        const finalEnd = remaining > 0 && remaining < 7 ? lastDay : chunkEnd;
        const start = new Date(year, m, day);
        const end = new Date(year, m, finalEnd);
        const issue = addDays(end, 1);
        const days = finalEnd - day + 1;
        out.push({
          period_name: `${pad(day)} - ${pad(finalEnd)} ${MONTHS[m]} ${year} (${days} days)`,
          start_date: iso(start),
          end_date: iso(end),
          issue_date: iso(issue),
        });
        day = finalEnd + 1;
      }
    }
  } else if (type === "Daily") {
    const today = new Date();
    const m = today.getMonth();
    const last = lastDayOfMonth(year, m);
    for (let d = 1; d <= last; d++) {
      const start = new Date(year, m, d);
      const issue = addDays(start, 1);
      out.push({
        period_name: `${pad(d)} ${MONTHS[m]} ${year}`,
        start_date: iso(start),
        end_date: iso(start),
        issue_date: iso(issue),
      });
    }
  } else if (type === "Quarterly") {
    for (let q = 0; q < 4; q++) {
      const sm = q * 3;
      const em = sm + 2;
      const start = new Date(year, sm, 1);
      const end = new Date(year, em, lastDayOfMonth(year, em));
      out.push({
        period_name: `${MONTHS[sm]}-${yy(year)} To ${MONTHS[em]}-${yy(year)}`,
        start_date: iso(start),
        end_date: iso(end),
        issue_date: iso(addDays(end, 1)),
      });
    }
  } else if (type === "Bi_Annual") {
    for (let h = 0; h < 2; h++) {
      const sm = h * 6;
      const em = sm + 5;
      const start = new Date(year, sm, 1);
      const end = new Date(year, em, lastDayOfMonth(year, em));
      out.push({
        period_name: `${MONTHS[sm]}-${yy(year)} To ${MONTHS[em]}-${yy(year)}`,
        start_date: iso(start),
        end_date: iso(end),
        issue_date: iso(addDays(end, 1)),
      });
    }
  } else if (type === "Tri_Annual") {
    for (let t = 0; t < 3; t++) {
      const sm = t * 4;
      const em = sm + 3;
      const start = new Date(year, sm, 1);
      const end = new Date(year, em, lastDayOfMonth(year, em));
      out.push({
        period_name: `${MONTHS[sm]}-${yy(year)} To ${MONTHS[em]}-${yy(year)}`,
        start_date: iso(start),
        end_date: iso(end),
        issue_date: iso(addDays(end, 1)),
      });
    }
  } else if (type === "Annual") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    out.push({
      period_name: `${year}`,
      start_date: iso(start),
      end_date: iso(end),
      issue_date: iso(addDays(end, 1)),
    });
  } else if (type === "One_Time") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 0, 1);
    out.push({
      period_name: `One Time ${year}`,
      start_date: iso(start),
      end_date: iso(end),
      issue_date: iso(addDays(end, 1)),
    });
  }

  return out;
}

export const PERIOD_TYPES: PeriodType[] = [
  "Annual",
  "Bi_Annual",
  "Tri_Annual",
  "Quarterly",
  "Monthly",
  "Weekly",
  "Daily",
  "One_Time",
];

export const PAYMENT_TYPES = [
  "Cash",
  "bKash",
  "Bank",
  "Rocket",
  "Nagad",
  "SSL Commerz",
  "Foster Payments",
  "Walletmix",
  "SureCash",
  "MCash",
  "UCash",
  "aamarPay",
  "PhonePe",
  "Razorpay",
  "Stripe",
  "Other",
];
