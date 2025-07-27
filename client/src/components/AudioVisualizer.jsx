const AudioVisualizer = ({ audioLevel }) => {
  return (
    <div
      style={{
        width: '200px',
        height: '6px',
        backgroundColor: '#e0e0e0',
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '8px 0',
        border: '1px solid #ccc',
      }}
    >
      <div
        style={{
          width: `${audioLevel * 100}%`,
          height: '100%',
          backgroundColor: audioLevel > 0.7 ? '#dc3545' : audioLevel > 0.3 ? '#fd7e14' : '#28a745',
          transition: 'width 0.1s ease-out',
          borderRadius: '2px',
        }}
      />
    </div>
  )
}

export default AudioVisualizer
