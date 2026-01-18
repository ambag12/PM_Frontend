import React from 'react';
import { FaStickyNote, FaComment, FaImage, FaFileAlt, FaEnvelope } from 'react-icons/fa';

const ActionBar = ({ onNotesClick, onRemarksClick, onPicturesClick, onReportClick, onEmailsClick }) => {
    return (
        <div className="action-bar">
            <div className="action-bar-content">
                <button className="btn btn-icon" onClick={onNotesClick}>
                    <FaStickyNote /> Notes
                </button>
                <button className="btn btn-icon" onClick={onRemarksClick}>
                    <FaComment /> Remarks
                </button>
                <button className="btn btn-icon" onClick={onPicturesClick}>
                    <FaImage /> Pictures
                </button>
                <button className="btn btn-icon" onClick={onReportClick}>
                    <FaFileAlt /> Program Report
                </button>
                <button className="btn btn-icon" onClick={onEmailsClick}>
                    <FaEnvelope /> Emails
                </button>
            </div>
        </div>
    );
};

export default ActionBar;
