class VideoTutorialModal {
  static init() {
      if (document.getElementById('video-tutorial-modal')) return;

      const modalHtml = `
          <div id="video-tutorial-modal" class="modal-overlay" style="display: none; opacity: 0; transition: opacity 0.3s ease;">
              <div class="modal-content video-modal-content">
                  <div class="modal-header">
                      <h3>📺 Tutorial em Vídeo</h3>
                      <button class="close-btn" onclick="VideoTutorialModal.close()">×</button>
                  </div>
                  <div class="modal-body">
                      <div class="video-container">
                          <iframe id="tutorial-video-frame" width="100%" height="315" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                      </div>
                  </div>
              </div>
          </div>
          <style>
              .video-modal-content {
                  max-width: 800px;
                  width: 90%;
                  background: #1a2332;
                  border: 1px solid #1de9b6;
                  border-radius: 10px;
                  color: white;
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                  transform: scale(0.9);
                  transition: transform 0.3s ease;
              }
              #video-tutorial-modal.show .video-modal-content {
                  transform: scale(1);
              }
              .video-container {
                  position: relative;
                  padding-bottom: 56.25%; /* 16:9 */
                  height: 0;
                  overflow: hidden;
                  border-radius: 8px;
                  background: #000;
              }
              .video-container iframe {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
              }
              .modal-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0, 0, 0, 0.85);
                  z-index: 10000;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  backdrop-filter: blur(5px);
              }
              .modal-overlay.show {
                  opacity: 1 !important;
              }
               .modal-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 15px 20px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 10px 10px 0 0;
              }
              .modal-header h3 {
                  margin: 0;
                  font-size: 1.2rem;
                  color: #1de9b6;
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }
              .modal-body {
                  padding: 20px;
              }
              .close-btn {
                  background: none;
                  border: none;
                  color: rgba(255, 255, 255, 0.7);
                  font-size: 28px;
                  cursor: pointer;
                  line-height: 1;
                  padding: 0;
                  transition: color 0.2s;
              }
              .close-btn:hover {
                  color: white;
              }
          </style>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Close on overlay click
      document.getElementById('video-tutorial-modal').addEventListener('click', (e) => {
          if (e.target.id === 'video-tutorial-modal') VideoTutorialModal.close();
      });

      // Close on ESC
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && document.getElementById('video-tutorial-modal').classList.contains('show')) {
              VideoTutorialModal.close();
          }
      });
  }

  static show(videoId) {
      if (!document.getElementById('video-tutorial-modal')) {
          this.init();
      }
      const modal = document.getElementById('video-tutorial-modal');
      const iframe = document.getElementById('tutorial-video-frame');

      // Show modal first for transition
      modal.style.display = 'flex';
      // Force reflow
      modal.offsetHeight;
      modal.classList.add('show');

      if (videoId) {
          iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else {
          // Fallback or placeholder if no ID provided
          iframe.src = `https://www.youtube.com/embed/placeholder?autoplay=1`;
      }
  }

  static close() {
      const modal = document.getElementById('video-tutorial-modal');
      const iframe = document.getElementById('tutorial-video-frame');

      modal.classList.remove('show');

      setTimeout(() => {
          iframe.src = ''; // Stop video
          modal.style.display = 'none';
      }, 300); // Wait for transition
  }
}
window.VideoTutorialModal = VideoTutorialModal;
