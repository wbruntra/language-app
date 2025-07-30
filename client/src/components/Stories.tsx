import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom'

interface StoryPanel {
  panelNumber: number
  description: string
  fullPrompt: string
  imageUrl: string
  thumbnailUrl?: string | null
}

interface StoryPrompt {
  storyDescription: string
  sceneDescriptions: string[]
  theme: string
  characterType: string
  generatedAt: string
}

interface StoryImages {
  panels: StoryPanel[]
  totalPanels: number
  imageType: string
}

interface Story {
  id: number
  prompt: StoryPrompt
  language: string
  images: StoryImages
  category: string
  difficulty: string
  description: string
  metadata?: any
  is_active: boolean
  usage_count: number
  upvotes: number
  downvotes: number
  created_at: string
  updated_at: string
}

interface Pagination {
  total: number
  page: number
  totalPages: number
  limit: number
  offset: number
  hasMore: boolean
}

interface StoriesResponse {
  success: boolean
  stories: Story[]
  pagination: Pagination
}

interface StoryDetailResponse {
  success: boolean
  story: Story
}

function Stories(): React.JSX.Element {
  const { storyId } = useParams<{ storyId: string }>()
  const navigate = useNavigate()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [loadingStory, setLoadingStory] = useState(false)

  // Determine view mode based on URL
  const isDetailView = !!storyId

  useEffect(() => {
    if (isDetailView && storyId) {
      // Load specific story if we're in detail view
      fetchStoryDetails(storyId)
    } else {
      // Load stories list if we're in list view
      fetchStories()
    }
  }, [storyId, isDetailView])

  const fetchStories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/stories?limit=20&is_active=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stories')
      }

      const data: StoriesResponse = await response.json()
      
      if (data.success) {
        setStories(data.stories)
      } else {
        throw new Error('Failed to load stories')
      }
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stories')
    } finally {
      setLoading(false)
    }
  }

  const fetchStoryDetails = async (id: string) => {
    try {
      setLoadingStory(true)
      setError(null)

      const response = await fetch(`/api/stories/${id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Story not found')
        }
        throw new Error('Failed to fetch story details')
      }

      const data: StoryDetailResponse = await response.json()
      
      if (data.success) {
        setSelectedStory(data.story)
      } else {
        throw new Error('Failed to load story details')
      }
    } catch (err) {
      console.error('Error fetching story details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load story details')
    } finally {
      setLoadingStory(false)
    }
  }

  const handleStoryClick = (storyId: number) => {
    navigate(`/stories/${storyId}`)
  }

  const handleBackToList = () => {
    navigate('/stories')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'success'
      case 'medium':
      case 'intermediate':
        return 'warning'
      case 'hard':
      case 'advanced':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Container fluid className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading stories...</span>
          </Spinner>
          <p>Loading stories...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchStories}>
            Try Again
          </Button>
        </Alert>
      </Container>
    )
  }

  // Story Detail View
  if (isDetailView && selectedStory) {
    return (
      <Container fluid className="mt-4">
        <Row>
          <Col>
            <div className="d-flex align-items-center mb-4">
              <Button variant="outline-secondary" onClick={handleBackToList} className="me-3">
                <i className="bi bi-arrow-left me-2"></i>
                Back to Stories
              </Button>
              <div>
                <h2 className="mb-1" style={{ textTransform: 'capitalize' }}>
                  {selectedStory.prompt.theme}
                </h2>
                <div className="d-flex gap-2">
                  <Badge bg="primary">Story ID: {selectedStory.id}</Badge>
                  <Badge bg="info">{selectedStory.language}</Badge>
                  <Badge bg={getDifficultyColor(selectedStory.difficulty)}>
                    {selectedStory.difficulty}
                  </Badge>
                  <Badge bg="secondary">{selectedStory.category}</Badge>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Story Overview */}
        <Row className="mb-4">
          <Col>
            <div className="p-3 bg-light rounded">
              <h5 className="text-success mb-2">
                <i className="bi bi-book-half me-2"></i>
                Story Overview
              </h5>
              <p className="mb-2">{selectedStory.prompt.storyDescription}</p>
              <p className="text-muted mb-0">{selectedStory.description}</p>
            </div>
          </Col>
        </Row>

        {/* Panels Grid */}
        <Row className="mb-4">
          {selectedStory.images.panels.map((panel) => (
            <Col key={panel.panelNumber} lg={6} className="mb-4">
              <div className="panel border rounded overflow-hidden shadow-sm">
                <div className="panel-header bg-dark text-white text-center py-2">
                  <strong>Panel {panel.panelNumber}</strong>
                </div>
                <div className="position-relative">
                  <img
                    src={panel.imageUrl}
                    alt={`Panel ${panel.panelNumber}`}
                    className="w-100"
                    style={{ height: '400px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                  />
                </div>
                <div className="panel-description p-3 border-top bg-white">
                  <small className="text-muted">{panel.description}</small>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Story Information */}
        <Row>
          <Col>
            <div className="p-3 bg-light rounded">
              <h5 className="mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Story Information
              </h5>
              <Row>
                <Col sm={6} md={3} className="mb-3">
                  <div className="bg-white p-3 rounded border">
                    <div className="small text-muted text-uppercase fw-bold mb-1">Character Type</div>
                    <div>{selectedStory.prompt.characterType}</div>
                  </div>
                </Col>
                <Col sm={6} md={3} className="mb-3">
                  <div className="bg-white p-3 rounded border">
                    <div className="small text-muted text-uppercase fw-bold mb-1">Created</div>
                    <div>{formatDate(selectedStory.created_at)}</div>
                  </div>
                </Col>
                <Col sm={6} md={3} className="mb-3">
                  <div className="bg-white p-3 rounded border">
                    <div className="small text-muted text-uppercase fw-bold mb-1">Usage Count</div>
                    <div>{selectedStory.usage_count}</div>
                  </div>
                </Col>
                <Col sm={6} md={3} className="mb-3">
                  <div className="bg-white p-3 rounded border">
                    <div className="small text-muted text-uppercase fw-bold mb-1">Active</div>
                    <div>{selectedStory.is_active ? 'Yes' : 'No'}</div>
                  </div>
                </Col>
                {(selectedStory.upvotes + selectedStory.downvotes > 0) && (
                  <Col sm={6} md={3} className="mb-3">
                    <div className="bg-white p-3 rounded border">
                      <div className="small text-muted text-uppercase fw-bold mb-1">Rating</div>
                      <div>👍 {selectedStory.upvotes} | 👎 {selectedStory.downvotes}</div>
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  // Loading state for detail view
  if (isDetailView && (loadingStory || !selectedStory)) {
    return (
      <Container fluid className="mt-4">
        <Row>
          <Col>
            <div className="d-flex align-items-center mb-4">
              <Button variant="outline-secondary" onClick={handleBackToList} className="me-3">
                <i className="bi bi-arrow-left me-2"></i>
                Back to Stories
              </Button>
              <div>
                <h2 className="mb-1">Loading Story...</h2>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col>
            <div className="text-center py-4">
              <Spinner animation="border" role="status" className="mb-3">
                <span className="visually-hidden">Loading story...</span>
              </Spinner>
              <p>Loading story details...</p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  // Stories List View
  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">📚 Comic Stories</h2>
              <p className="text-muted">Interactive visual stories for language learning</p>
            </div>
            <Button variant="outline-primary" onClick={fetchStories}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {stories.length === 0 ? (
        <Row>
          <Col>
            <Alert variant="info" className="text-center">
              <h5>No Stories Available</h5>
              <p>There are currently no comic stories available. Check back later!</p>
            </Alert>
          </Col>
        </Row>
      ) : (
        <Row>
          {stories.map((story) => (
            <Col key={story.id} xl={4} lg={6} md={6} className="mb-4">
              <Card className="h-100 shadow-sm story-card" style={{ cursor: 'pointer' }}>
                <Card.Body onClick={() => handleStoryClick(story.id)}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Badge bg="primary">ID: {story.id}</Badge>
                    <Badge bg={getDifficultyColor(story.difficulty)}>
                      {story.difficulty}
                    </Badge>
                  </div>
                  
                  <Card.Title className="h5 mb-2" style={{ textTransform: 'capitalize' }}>
                    {story.prompt.theme}
                  </Card.Title>
                  
                  <Card.Text className="text-muted small mb-2">
                    {story.description}
                  </Card.Text>

                  <div className="mb-3">
                    <small className="text-muted">
                      <strong>Language:</strong> {story.language} | 
                      <strong className="ms-2">Category:</strong> {story.category}
                    </small>
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">
                      <strong>Characters:</strong> {story.prompt.characterType}
                    </small>
                  </div>

                  {/* Show first panel image as preview */}
                  {story.images.panels.length > 0 && (
                    <div className="text-center mb-3">
                      <img
                        src={story.images.panels[0].thumbnailUrl || story.images.panels[0].imageUrl}
                        alt="Story preview"
                        className="img-fluid rounded"
                        style={{ maxHeight: '150px', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {story.images.totalPanels} panels
                    </small>
                    <small className="text-muted">
                      Used {story.usage_count} times
                    </small>
                  </div>
                </Card.Body>
                
                <Card.Footer className="bg-light">
                  <small className="text-muted">
                    Created: {formatDate(story.created_at)}
                  </small>
                  {(story.upvotes > 0 || story.downvotes > 0) && (
                    <div className="float-end">
                      <span className="me-2">👍 {story.upvotes}</span>
                      <span>👎 {story.downvotes}</span>
                    </div>
                  )}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <style>{`
        .story-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        
        .story-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
        }
        
        .panel {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .panel-header {
          font-weight: bold;
        }
        
        @media (max-width: 768px) {
          .story-detail .row .col-lg-6 {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </Container>
  )
}

export default Stories
