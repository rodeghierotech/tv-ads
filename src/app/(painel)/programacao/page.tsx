import { getSchedulePanelData } from "@/actions/schedule";
import { ScheduleCalendar } from "./schedule-calendar";

export default async function SchedulePage() {
  return <ScheduleCalendar initialData={await getSchedulePanelData()} />;
}
