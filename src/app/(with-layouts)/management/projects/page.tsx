import { PageHeader } from "@/components/common/page-header";
import { ProjectManagementView } from "@/components/management/project-management-view";
import { managementRepo } from "@/services/management/mock-repository";

export default async function ProjectsManagementPage() {
  const projects = await managementRepo.getProjects();

  return (
    <>
      <PageHeader
        title="프로젝트 그룹 레지스트리"
        description="최상위 프로젝트 그룹(RPA, MES, AI Platform, Data Platform)을 구성하여 인프라 도메인, 자산 및 네트워크 모니터링 범위를 설정합니다."
      />
      <ProjectManagementView initialProjects={projects} />
    </>
  );
}
