import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaBook, FaEdit, FaTrash, FaLink } from 'react-icons/fa';
import { wikiService, projectService } from '../api/services';
import { PermissionProvider, PermissionGate } from '../context/PermissionContext';
import { Card, Button, Modal } from '../components/UI';

const Wiki = () => {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [pages, setPages] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPage, setNewPage] = useState({ title: '', content: '' });

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectRes, pagesRes, linksRes] = await Promise.all([
                projectService.get(projectId),
                wikiService.listPages({ project: projectId }),
                wikiService.listLinks({ project: projectId })
            ]);
            setProject(projectRes.data);
            setPages(pagesRes.data);
            setLinks(linksRes.data);

            // Select first page if available
            if (pagesRes.data.length > 0 && !selectedPage) {
                setSelectedPage(pagesRes.data[0]);
            }
        } catch (error) {
            console.error('Error fetching wiki data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePage = async () => {
        try {
            const response = await wikiService.createPage({
                project: projectId,
                slug: newPage.title.toLowerCase().replace(/\s+/g, '-'),
                content: newPage.content,
            });
            setShowCreateModal(false);
            setNewPage({ title: '', content: '' });
            fetchData();
            setSelectedPage(response.data);
        } catch (error) {
            console.error('Error creating wiki page:', error);
        }
    };

    const handleDeletePage = async (pageId) => {
        if (!window.confirm('Are you sure you want to delete this page?')) return;

        try {
            await wikiService.deletePage(pageId);
            if (selectedPage?.id === pageId) {
                setSelectedPage(null);
            }
            fetchData();
        } catch (error) {
            console.error('Error deleting wiki page:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <PermissionProvider project={project}>
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-title">Wiki</h1>
                        <p className="page-subtitle">{project?.name} • {pages.length} pages</p>
                    </div>
                    <PermissionGate resourceType="wiki" action="add">
                        <Button
                            variant="primary"
                            icon={<FaPlus />}
                            onClick={() => setShowCreateModal(true)}
                        >
                            New Page
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Wiki Layout */}
            <div style={{ display: 'flex', gap: '1.5rem', minHeight: '500px' }}>
                {/* Sidebar - Page List */}
                <div style={{ width: '280px', flexShrink: 0 }}>
                    <Card>
                        <h3 className="font-semibold mb-4">Pages</h3>
                        {pages.length === 0 ? (
                            <p className="text-sm text-muted">No wiki pages yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {pages.map((page) => (
                                    <div
                                        key={page.id}
                                        onClick={() => setSelectedPage(page)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            background: selectedPage?.id === page.id ? 'var(--primary-50)' : 'transparent',
                                            color: selectedPage?.id === page.id ? 'var(--primary-700)' : 'var(--text-primary)',
                                            transition: 'all var(--transition-fast)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <FaBook size={12} />
                                        <span className="truncate">{page.slug}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Quick Links */}
                    {links.length > 0 && (
                        <Card className="mt-4">
                            <h3 className="font-semibold mb-4">Quick Links</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {links.map((link) => (
                                    <div
                                        key={link.id}
                                        onClick={() => {
                                            const page = pages.find(p => p.id === link.wiki_page);
                                            if (page) setSelectedPage(page);
                                        }}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            color: 'var(--primary-600)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <FaLink size={10} />
                                        {link.title}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Main Content - Selected Page */}
                <div style={{ flex: 1 }}>
                    {selectedPage ? (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">{selectedPage.slug}</h2>
                                <div className="flex gap-2">
                                    <PermissionGate resourceType="wiki" action="modify">
                                        <Button variant="secondary" size="sm" icon={<FaEdit />}>
                                            Edit
                                        </Button>
                                    </PermissionGate>
                                    <PermissionGate resourceType="wiki" action="delete">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            icon={<FaTrash />}
                                            onClick={() => handleDeletePage(selectedPage.id)}
                                        >
                                            Delete
                                        </Button>
                                    </PermissionGate>
                                </div>
                            </div>
                            <div
                                className="wiki-content"
                                style={{
                                    lineHeight: 1.7,
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {selectedPage.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedPage.html || selectedPage.content }} />
                                ) : (
                                    <p className="text-muted">No content on this page.</p>
                                )}
                            </div>
                            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                                <p className="text-sm text-muted">
                                    Last modified: {new Date(selectedPage.modified_date).toLocaleDateString()}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="empty-state">
                                <div className="empty-state-icon">📖</div>
                                <h3 className="empty-state-title">No Page Selected</h3>
                                <p className="empty-state-description">
                                    Select a page from the sidebar or create a new one.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Page Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Wiki Page"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreatePage}
                            disabled={!newPage.title.trim()}
                        >
                            Create Page
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Page Title *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Page title (will be used as slug)..."
                        value={newPage.title}
                        onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Content</label>
                    <textarea
                        className="form-input"
                        placeholder="Write your wiki content here (markdown supported)..."
                        value={newPage.content}
                        onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
                        rows={10}
                        style={{ fontFamily: 'monospace' }}
                    />
                </div>
            </Modal>
        </PermissionProvider>
    );
};

export default Wiki;
