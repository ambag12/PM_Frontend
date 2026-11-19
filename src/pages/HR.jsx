import React from 'react';
import { useParams } from 'react-router-dom';
import { FaUserTie } from 'react-icons/fa';
import HRBoard from '../components/HR';

// Serves both /hr (all of my projects) and /project/:id/hr (one project).
const HR = () => {
    const { id: projectId } = useParams();
    return (
        <HRBoard
            key={projectId || 'all'}
            projectId={projectId}
            header={{
                title: projectId ? 'HR & staffing' : 'HR & staffing — all projects',
                icon: <FaUserTie />,
                subtitle: projectId
                    ? 'Sanctioned posts, recruitment progress and vacancies for this project'
                    : 'Sanctioned posts and vacancies across all your projects',
            }}
        />
    );
};

export default HR;
