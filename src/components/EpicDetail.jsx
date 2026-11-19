import React from 'react';
import WorkItemDrawer from './work/WorkItemDrawer';
import RelatedStories from './work/RelatedStories';
import ColorField from './work/ColorField';
import { ToggleField } from './work/SideFields';

/*
 * Epic detail drawer.
 *   <EpicDetail epicId={id} projectId={pid} onClose onUpdate={(epic) => …} onDelete={(id) => …} />
 */
const EpicDetail = ({ epicId, projectId, onClose, onUpdate, onDelete }) => (
    <WorkItemDrawer
        type="epic"
        id={epicId}
        projectId={projectId}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        renderBadges={({ item }) => (
            <span className="epic-swatch" style={{ '--epic': item.color || 'var(--primary-500)' }} title={`Epic colour ${item.color || ''}`} />
        )}
        renderMain={({ item, project, projectId: pid, canModify, can, reload }) => (
            <RelatedStories
                epic={item}
                project={project}
                projectId={pid}
                canModify={canModify && can('modify_us')}
                onChanged={() => { reload(); onUpdate?.(item); }}
            />
        )}
        renderSideTop={({ item, save, canModify }) => (
            <ColorField value={item.color} disabled={!canModify} onChange={(color) => save({ color })} />
        )}
        renderSideBottom={({ item, save, canModify }) => (
            <div className="stack-sm">
                <ToggleField label="Client requirement" checked={item.client_requirement} disabled={!canModify} onChange={(v) => save({ client_requirement: v })} />
                <ToggleField label="Team requirement" checked={item.team_requirement} disabled={!canModify} onChange={(v) => save({ team_requirement: v })} />
            </div>
        )}
    />
);

export default EpicDetail;
