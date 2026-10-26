import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <p className="text-center text-xl font-extrabold text-burgundy">Мамины петельки</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
