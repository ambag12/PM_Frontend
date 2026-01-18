import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { FaArrowLeft, FaList, FaTasks, FaCalendarAlt, FaCog, FaPlus, FaExclamationCircle, FaFileContract, FaUserTie } from 'react-icons/fa';
import Header from '../components/Header';
import ActionBar from '../components/ActionBar';
import StatusBadge from '../components/StatusBadge';
import Milestones from '../components/Milestones';
import Tenders from '../components/Tenders';
import HR from '../components/HR';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateUserStoryModal from '../components/CreateUserStoryModal';
import UserStoryDetail from '../components/UserStoryDetail';
import TaskDetail from '../components/TaskDetail';
import CreateIssueModal from '../components/CreateIssueModal';
import IssueDetail from '../components/IssueDetail';
import FilterBar from '../components/FilterBar';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [userStories, setUserStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('stories');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', assignee: '', tag: '' });
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const projectRes = await client.get(`projects/${id}`);
      setProject(projectRes.data);

      const storiesRes = await client.get(`userstories?project=${id}`);
      setUserStories(storiesRes.data);

      const tasksRes = await client.get(`tasks?project=${id}`);
      setTasks(tasksRes.data);

      const issuesRes = await client.get(`issues?project=${id}`);
      setIssues(issuesRes.data);

      // Fetch filter data based on active tab
      const membersRes = await client.get(`memberships?project=${id}`);
      setMembers(membersRes.data);
    } catch (error) {
      console.error("Error fetching project details", error);
    }
  };

  const handleTaskCreated = () => {
    fetchData();
  };

  const handleStoryCreated = () => {
    fetchData();
  };

  const handleStoryUpdate = () => {
    fetchData();
  };

  const handleStoryDelete = () => {
    fetchData();
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story.id);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task.id);
  };

  const handleIssueCreated = () => {
    fetchData();
  };

  const handleIssueClick = (issue) => {
    setSelectedIssue(issue.id);
  };

  // Fetch statuses when tab changes
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        if (activeTab === 'stories') {
          const res = await client.get(`userstory-statuses?project=${id}`);
          setStatuses(res.data);
        } else if (activeTab === 'tasks') {
          const res = await client.get(`task-statuses?project=${id}`);
          setStatuses(res.data);
        } else if (activeTab === 'issues') {
          const res = await client.get(`issue-statuses?project=${id}`);
          setStatuses(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch statuses', err);
      }
    };
    fetchStatuses();
  }, [activeTab, id]);

  // Filter function
  const filterItems = (items) => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm ||
        item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ref && item.ref.toString().includes(searchTerm));

      // Status filter
      const matchesStatus = !filters.status || item.status === parseInt(filters.status);

      // Assignee filter
      let matchesAssignee = true;
      if (filters.assignee) {
        if (filters.assignee === 'unassigned') {
          matchesAssignee = !item.assigned_to;
        } else {
          matchesAssignee = item.assigned_to === parseInt(filters.assignee);
        }
      }

      // Tag filter
      const matchesTag = !filters.tag ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(filters.tag.toLowerCase())));

      return matchesSearch && matchesStatus && matchesAssignee && matchesTag;
    });
  };

  const filteredStories = filterItems(userStories);
  const filteredTasks = filterItems(tasks);
  const filteredIssues = filterItems(issues);

  if (!project) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

  return (
    <div>
      <Header title="Project Management System" subtitle={project.name} />

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>
            <FaArrowLeft style={{ marginRight: '0.5rem' }} /> Back to Dashboard
          </Link>
          <Link to={`/project/${id}/settings`} className="btn btn-secondary">
            <FaCog /> Settings
          </Link>
        </div>

        <header style={{ marginBottom: '2rem' }}>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle" style={{ maxWidth: '900px' }}>{project.description || 'No description'}</p>
        </header>

        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('stories')}
            className={`tab-button ${activeTab === 'stories' ? 'active' : ''}`}
          >
            <FaList style={{ marginRight: '0.5rem' }} /> User Stories
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            <FaTasks style={{ marginRight: '0.5rem' }} /> Tasks
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`tab-button ${activeTab === 'issues' ? 'active' : ''}`}
          >
            <FaExclamationCircle style={{ marginRight: '0.5rem' }} /> Issues
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`tab-button ${activeTab === 'milestones' ? 'active' : ''}`}
          >
            <FaCalendarAlt style={{ marginRight: '0.5rem' }} /> Milestones
          </button>
          <button
            onClick={() => setActiveTab('tenders')}
            className={`tab-button ${activeTab === 'tenders' ? 'active' : ''}`}
          >
            <FaFileContract style={{ marginRight: '0.5rem' }} /> Tenders
          </button>
          <button
            onClick={() => setActiveTab('hr')}
            className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
          >
            <FaUserTie style={{ marginRight: '0.5rem' }} /> HR
          </button>
        </div>

        <div>
          {activeTab === 'stories' && (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-dark)' }}>User Stories</h2>
                <button
                  onClick={() => setShowStoryModal(true)}
                  className="btn btn-primary"
                >
                  <FaPlus /> Create User Story
                </button>
              </div>

              {filteredStories.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No user stories found. Create your first user story!</p>
              ) : (
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>S.No</th>
                      <th style={{ width: '100px' }}>Ref #</th>
                      <th>Subject</th>
                      <th style={{ width: '150px' }}>Status</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStories.map((story, index) => (
                      <tr
                        key={story.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleStoryClick(story)}
                      >
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary-green)' }}>#{story.ref}</td>
                        <td style={{ fontWeight: '500' }}>{story.subject}</td>
                        <td>
                          <StatusBadge status={story.status_extra_info?.name || 'Unknown'} />
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            style={{
                              background: 'var(--action-green)',
                              color: 'white',
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStoryClick(story);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'tasks' && (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-dark)' }}>Tasks</h2>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="btn btn-primary"
                >
                  <FaPlus /> Create Task
                </button>
              </div>

              {filteredTasks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No tasks found. Create your first task!</p>
              ) : (
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>S.No</th>
                      <th style={{ width: '100px' }}>Ref #</th>
                      <th>Subject</th>
                      <th style={{ width: '150px' }}>Status</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task, index) => (
                      <tr
                        key={task.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTaskClick(task)}
                      >
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '600', color: 'var(--status-progress)' }}>#{task.ref}</td>
                        <td style={{ fontWeight: '500' }}>{task.subject}</td>
                        <td>
                          <StatusBadge status={task.status_extra_info?.name || 'Unknown'} />
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            style={{
                              background: 'var(--action-green)',
                              color: 'white',
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskClick(task);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'issues' && (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-dark)' }}>Issues</h2>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="btn btn-primary"
                >
                  <FaPlus /> Create Issue
                </button>
              </div>

              {filteredIssues.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No issues found. Create your first issue!</p>
              ) : (
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>S.No</th>
                      <th style={{ width: '100px' }}>Ref #</th>
                      <th>Subject</th>
                      <th style={{ width: '120px' }}>Type</th>
                      <th style={{ width: '120px' }}>Priority</th>
                      <th style={{ width: '150px' }}>Status</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue, index) => (
                      <tr
                        key={issue.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleIssueClick(issue)}
                      >
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '600', color: 'var(--status-pending)' }}>#{issue.ref}</td>
                        <td style={{ fontWeight: '500' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaExclamationCircle style={{ color: 'var(--status-pending)', fontSize: '0.9rem' }} />
                            {issue.subject}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: 'rgba(244, 67, 54, 0.1)',
                            color: 'var(--status-pending)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {issue.type_extra_info?.name || 'Bug'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            background: 'rgba(255, 152, 0, 0.1)',
                            color: 'var(--status-progress)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {issue.priority_extra_info?.name || 'Normal'}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={issue.status_extra_info?.name || 'Unknown'} />
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            style={{
                              background: 'var(--action-green)',
                              color: 'white',
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIssueClick(issue);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'milestones' && (
            <Milestones projectId={id} />
          )}

          {activeTab === 'tenders' && (
            <Tenders projectId={id} />
          )}

          {activeTab === 'hr' && (
            <HR projectId={id} />
          )}
        </div>
      </div>

      <ActionBar
        onNotesClick={() => console.log('Notes')}
        onRemarksClick={() => console.log('Remarks')}
        onPicturesClick={() => console.log('Pictures')}
        onReportClick={() => console.log('Report')}
        onEmailsClick={() => console.log('Emails')}
      />

      {showTaskModal && (
        <CreateTaskModal
          projectId={id}
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {showStoryModal && (
        <CreateUserStoryModal
          projectId={id}
          onClose={() => setShowStoryModal(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {showIssueModal && (
        <CreateIssueModal
          projectId={id}
          onClose={() => setShowIssueModal(false)}
          onIssueCreated={handleIssueCreated}
        />
      )}

      {selectedStory && (
        <UserStoryDetail
          storyId={selectedStory}
          onClose={() => setSelectedStory(null)}
          onUpdate={handleStoryUpdate}
          onDelete={handleStoryDelete}
        />
      )}

      {selectedTask && (
        <TaskDetail
          taskId={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskCreated}
          onDelete={handleTaskCreated}
        />
      )}

      {selectedIssue && (
        <IssueDetail
          issueId={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={handleIssueCreated}
          onDelete={handleIssueCreated}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
