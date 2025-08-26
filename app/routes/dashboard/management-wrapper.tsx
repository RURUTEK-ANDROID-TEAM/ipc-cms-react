import Management from "./management";

// This wrapper always enforces hideUsersTable={false}
export default function ManagementWrapper() {
  return <Management hideUsersTable={false} />;
}
