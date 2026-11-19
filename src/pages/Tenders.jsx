import React from 'react';
import { useParams } from 'react-router-dom';
import { FaFileContract } from 'react-icons/fa';
import TendersBoard from '../components/Tenders';

// Serves both /tenders (all of my projects) and /project/:id/tenders (one project).
const Tenders = () => {
    const { id: projectId } = useParams();
    return (
        <TendersBoard
            key={projectId || 'all'}
            projectId={projectId}
            header={{
                title: projectId ? 'Tenders' : 'All tenders',
                icon: <FaFileContract />,
                subtitle: projectId
                    ? 'Procurement packages, bid openings and committee remarks for this project'
                    : 'Procurement packages across all your projects',
            }}
        />
    );
};

export default Tenders;
