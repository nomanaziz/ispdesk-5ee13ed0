import AddClient from "@/pages/dashboard/clients/AddClient";

// POP-admin client creation reuses the full Admin AddClient form,
// auto-scoping all queries to the POP's branch via usePopScope().
export default function PopAddClient() {
  return <AddClient />;
}
