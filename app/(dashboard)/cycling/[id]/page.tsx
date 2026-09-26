import { RideDetail } from '@/components/cycling/RideDetail';

type Props = { params: Promise<{ id: string }> };

export default async function RideDetailPage({ params }: Props) {
  const { id } = await params;
  return <RideDetail rideId={id} />;
}
