import React from 'react';
import { useParams } from 'react-router-dom';
import MilestonesView from '../components/Milestones';

// /project/:id/milestones — sprint list, burndown and taskboard.
const Milestones = () => {
    const { id } = useParams();
    return <MilestonesView projectId={id} header />;
};

export default Milestones;
