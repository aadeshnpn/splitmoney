import ExpenseDetailPage from '@/components/ExpenseDetailPage';

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default async function ExpenseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpenseDetailPage expenseId={id} />;
}
