import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useLanguageConfig } from '../hooks/useLanguageHelper'

function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const { user } = useUser()
  const { currentLanguage } = useLanguageConfig()

  const modules = [
    {
      title: 'Conversation Practice',
      description: 'Practice speaking and get real-time corrections and feedback',
      icon: 'bi-chat-square-text',
      route: '/conversation',
      color: 'primary'
    },
    {
      title: 'Vocabulary Builder',
      description: 'Build and practice your vocabulary with personalized exercises',
      icon: 'bi-book',
      route: '/vocabulary',
      color: 'success'
    },
    {
      title: 'Taboo Game',
      description: 'Fun word game to improve your language skills',
      icon: 'bi-puzzle',
      route: '/taboo',
      color: 'info'
    },
    {
      title: 'Stories',
      description: 'Read interactive stories and improve comprehension',
      icon: 'bi-journal-text',
      route: '/stories',
      color: 'secondary'
    }
  ]

  // Add admin module if user is admin
  if (user?.is_admin) {
    modules.push({
      title: 'Admin Panel',
      description: 'Administrative tools and system management',
      icon: 'bi-shield-check',
      route: '/admin',
      color: 'warning'
    })
  }

  const handleModuleClick = (route: string) => {
    navigate(route)
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          {/* Welcome header */}
          <div className="text-center mb-5">
            <h1 className="display-5 fw-bold mb-3">
              Welcome to {currentLanguage.name} Language Helper
            </h1>
            {user?.first_name && (
              <p className="lead text-muted">
                Hello, {user.first_name}! Choose a module to get started.
              </p>
            )}
          </div>

          {/* Main menu cards */}
          <div className="row g-4">
            {modules.map((module, index) => (
              <div key={index} className="col-12 col-md-6 col-lg-4">
                <div 
                  className={`card h-100 shadow-sm border-${module.color} hover-card`}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onClick={() => handleModuleClick(module.route)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div className={`card-header bg-${module.color} text-white`}>
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <i className={`${module.icon} me-2`} style={{ fontSize: '1.2rem' }}></i>
                      {module.title}
                    </h5>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <p className="card-text flex-grow-1">{module.description}</p>
                    <div className="mt-auto">
                      <button 
                        className={`btn btn-outline-${module.color} w-100`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleModuleClick(module.route)
                        }}
                      >
                        Get Started <i className="bi bi-arrow-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats or additional info */}
          <div className="row mt-5">
            <div className="col-12">
              <div className="card bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-info-circle me-2"></i>
                    Getting Started
                  </h6>
                  <p className="card-text small text-muted mb-0">
                    Choose any module above to begin your {currentLanguage.name} learning journey. 
                    Each module is designed to help you improve different aspects of your language skills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
