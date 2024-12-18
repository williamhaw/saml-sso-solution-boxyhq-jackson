import type { NextPage, GetServerSideProps, NextApiRequest } from 'next';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useProject, useGroups } from '@lib/ui/retraced';
import { LinkBack, Loading, Error } from '@boxyhq/internal-ui';
import { Select } from 'react-daisyui';
import { retracedOptions, terminusOptions } from '@lib/env';
import { useTranslation } from 'next-i18next';
import { getToken } from '@lib/retraced';
import type { Project } from 'types/retraced';
import axios from 'axios';

const LogsViewer = dynamic(() => import('@components/retraced/LogsViewer'), {
  ssr: false,
});

export interface Props {
  host?: string;
  projectId: string;
}

const Events: NextPage<Props> = ({ host, projectId }: Props) => {
  const { t } = useTranslation('common');

  const [environment, setEnvironment] = useState('');
  const [group, setGroup] = useState('');

  const { project, isLoading, isError } = useProject(projectId);
  const { groups } = useGroups(projectId, environment);

  // Set the environment
  useEffect(() => {
    if (project) {
      setEnvironment(project.environments[0]?.id);
    }
  }, [project]);

  // Set the group
  useEffect(() => {
    if (groups && groups.length > 0) {
      setGroup(groups[0].group_id);
    }
  }, [groups]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={t('error_loading_page')} />;
  }

  const displayLogsViewer = project && environment && group;

  return (
    <div>
      <LinkBack href='/admin/retraced/projects' />
      <div className='mb-2 mt-5 flex items-center justify-between'>
        <h2 className='font-bold text-gray-700 dark:text-white md:text-xl'>{project?.name}</h2>
      </div>
      <div className='flex space-x-2'>
        <div className='form-control max-w-xs'>
          <label className='label pl-0'>
            <span className='label-text'>{t('environment')}</span>
          </label>
          {project ? (
            <Select
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value);
                setGroup('');
              }}>
              {project!.environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className='form-control max-w-xs'>
          <label className='label pl-0'>
            <span className='label-text'>{t('group_or_tenant')}</span>
          </label>
          {groups ? (
            <Select
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
              }}>
              {groups!.map((group) => (
                <option key={group.group_id} value={group.group_id}>
                  {group.name ? group.name : group.group_id}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>
      <div className='flex'>
        {displayLogsViewer && (
          <LogsViewer project={project} environmentId={environment} groupId={group} host={host!} />
        )}
      </div>
    </div>
  );
};

export const getServerSideProps = (async ({ locale, req }) => {
  if (!terminusOptions.retracedProjectId) {
    return {
      notFound: true,
    };
  } else {
    const token = await getToken(req as NextApiRequest);
    try {
      const { data } = await axios.get<{ project: Project }>(
        `${retracedOptions?.hostUrl}/admin/v1/project/${terminusOptions.retracedProjectId}`,
        {
          headers: {
            Authorization: `id=${token.id} token=${token.token} admin_token=${retracedOptions.adminToken}`,
          },
        }
      );
      if (data.project.environments.length === 0) {
        return {
          notFound: true,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return {
        notFound: true,
      };
    }
  }

  return {
    props: {
      ...(await serverSideTranslations(locale!, ['common'])),
      host: retracedOptions.externalUrl,
      projectId: terminusOptions.retracedProjectId,
    },
  };
}) satisfies GetServerSideProps;

export default Events;
