
import LoginPage from "@/app/components/LoginPage"
import {auth0} from "@/lib/auth0";
import { redirect } from "next/navigation";
const Index = async () => {
  const session=await auth0.getSession();
  console.log(session);
  if (session) {
    redirect("/chat");
  }
  return <LoginPage />
}

export default Index