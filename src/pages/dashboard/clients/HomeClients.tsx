import ClientList from "./ClientList";

/**
 * Home-only client list. Reuses ClientList with a locked client_type filter.
 */
export default function HomeClients() {
  return (
    <ClientList
      lockedClientType="Home"
      pageTitle="হোম ক্লায়েন্ট"
      pageDescription="শুধু হোম (Home) ক্লায়েন্টদের তালিকা — সাধারণত PPPoE প্রটোকলে কানেক্টেড"
    />
  );
}
