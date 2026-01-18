import React from 'react';
import { useParams } from 'react-router-dom';
import TendersComponent from '../components/Tenders';

const Tenders = () => {
    const { id: projectId } = useParams();

    return (
        <div className="container py-8">
            <div className="page-header">
                <h1 className="page-title">Tenders</h1>
                <p className="page-subtitle">Manage project tenders and contracts</p>
            </div>
            <TendersComponent projectId={projectId} />
        </div>
    );
};

export default Tenders;
