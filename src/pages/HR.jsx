import React from 'react';
import { useParams } from 'react-router-dom';
import HRComponent from '../components/HR';

const HR = () => {
    const { id: projectId } = useParams();

    return (
        <div className="container py-8">
            <div className="page-header">
                <h1 className="page-title">HR Management</h1>
                <p className="page-subtitle">Track human resources and function records</p>
            </div>
            <HRComponent projectId={projectId} />
        </div>
    );
};

export default HR;
