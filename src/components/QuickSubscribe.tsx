"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { SubscriptionAction } from "@/components/SubscriptionAction";
import { useFetch } from "@/hooks/useFetch";
import { useSubscription } from "@/hooks/useSubscription";
import type { PaginatedResponse } from "@/types/api";
import { IApplication, IModule } from "@/models";
import { useSession } from "next-auth/react";
import { Select } from "./form";

function ApplicationSelect({
  onSelect,
}: {
  onSelect: (application: IApplication) => void;
}) {
  const {
    data: applicationsData,
    loading: applicationsLoading,
    refetch: refetchApplications,
  } = useFetch<PaginatedResponse<IApplication>>(`/api/applications`);

  useEffect(() => {
    if (
      applicationsData != null &&
      applicationsData.applications != null &&
      applicationsData.applications.length > 0
    ) {
      onSelect(applicationsData.applications[0]);
    }
  }, [applicationsData, onSelect]);

  if (
    applicationsLoading ||
    applicationsData == null ||
    applicationsData.applications == null
  ) {
    return <p>Loading....</p>;
  }

  return (
    <Select
      onChange={(e) => {
        const value = e.target.value;
        const selection = applicationsData.applications?.find((application) => application.name === value);
        if (selection == null) return;
        onSelect(selection);
      }}
      options={applicationsData.applications.map((application) => ({
        value: application.name,
        label: application.name,
      }))}
    ></Select>
  );
}

function SubscribeButton({
  module,
  application,
}: {
  module: IModule;
  application: IApplication;
}) {
  const { loading, error, subscribingTo, getSubscription, subscribe } =
    useSubscription({ applicationId: application._id.toString() });

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  const moduleId = module._id.toString();
  const subscription = getSubscription(moduleId);

  return (
    <div className="py-3">
      <ErrorMessage error={error} className="mb-3" />

      <div className="space-y-4">
        <SubscriptionAction
          moduleId={moduleId}
          subscription={subscription}
          subscribingTo={subscribingTo}
          onSubscribe={() => subscribe(moduleId)}
        />
      </div>
    </div>
  );
}

export function QuickSubscribe({ module }: { module: IModule }) {
  const { data: session, status } = useSession();
  const [application, setApplication] = useState<IApplication | undefined>();

  if (!status) return <></>;

  return (
    <div>
      <ApplicationSelect onSelect={setApplication}></ApplicationSelect>
      {application != null && (
        <SubscribeButton
          module={module}
          application={application}
        ></SubscribeButton>
      )}
    </div>
  );
}
