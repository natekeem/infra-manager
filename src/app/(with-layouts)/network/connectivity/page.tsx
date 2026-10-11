import { PageHeader } from "@/components/common/page-header";
import { NetworkTable } from "@/components/network/network-table";
import { getNetworkStatuses } from "@/services/api/infrastructure";

export default async function Page() {
  const statuses = await getNetworkStatuses();
  return (
    <>
      <PageHeader
        title="정책 및 연결 상태"
        description="방화벽 정책이 기준선(Should Be)이며, 출발지 Telegraf Ping/TCP 프로브가 실측 상태(Actual)로 결합됩니다."
      />
      <NetworkTable statuses={statuses} />
    </>
  );
}
