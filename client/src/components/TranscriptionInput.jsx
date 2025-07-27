import { useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setEditedTranscription } from '../store/languageHelperSlice'

const TranscriptionInput = ({ currentLanguage, onSendMessage, conversationLoading }) => {
  const dispatch = useDispatch()
  const editedTranscription = useSelector((state) => state.languageHelper.editedTranscription)
  const textareaRef = useRef(null)

  const handleTranscriptionEdit = (e) => {
    dispatch(setEditedTranscription(e.target.value))
  }

  return (
    <div className="transcription mt-3">
      <h6>Your Message</h6>
      <textarea
        ref={textareaRef}
        value={editedTranscription}
        onChange={handleTranscriptionEdit}
        rows={4}
        className="form-control"
        placeholder={`Speak to transcribe, or type your ${currentLanguage.name} message here...`}
      />
      <div className="mt-2 d-grid">
        <button
          className="btn btn-success"
          onClick={onSendMessage}
          disabled={conversationLoading || !editedTranscription.trim()}
        >
          {conversationLoading ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  )
}

export default TranscriptionInput
