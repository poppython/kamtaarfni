import Game from "@/components/Game";

export default function QuizPage({ params }: { params: { slug: string } }) {
  return <Game slug={params.slug} />;
}
