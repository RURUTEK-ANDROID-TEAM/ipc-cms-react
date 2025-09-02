import { useOutletContext } from "react-router";
import Management from "./management";

export default function ManagementWrapper() {
  const context = useOutletContext<any>();
  context.title = "Live View";
  context.actions = <></>;

  return <Management hideUsersTable={false} />;
}
