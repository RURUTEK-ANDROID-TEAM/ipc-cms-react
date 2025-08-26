import Management from "./management";

// This wrapper always enforces hideUsersTable={true}
export default function ManagementWrapper() {
  return <Management hideUsersTable={false} />;
}
