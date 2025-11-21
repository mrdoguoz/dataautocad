const HISTORY_KEY = 'autocad-metraj-jobs';
const jobResultEl = document.getElementById('job-result');
const historyListEl = document.getElementById('history-list');
const copyBtn = document.getElementById('copy-btn');

function getStoredJobs() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (error) {
    console.warn('Yerel kayıt okunamadı', error);
    return [];
  }
}

function renderHistory(jobs) {
  if (!historyListEl) return;
  historyListEl.innerHTML = '';
  if (!jobs.length) {
    const li = document.createElement('li');
    li.textContent = 'Henüz kayıtlı bir iş bulunmuyor.';
    historyListEl.appendChild(li);
    return;
  }

  jobs.forEach((job) => {
    const li = document.createElement('li');
    const time = new Date(job.createdAt).toLocaleString('tr-TR');
    li.innerHTML = `<strong>${job.jobId}</strong> · ${job.fileName} · ${time}`;
    historyListEl.appendChild(li);
  });
}

function showJob(jobId, jobs) {
  if (!jobResultEl) return;
  if (!jobId) {
    jobResultEl.textContent = 'İş ID parametresi bulunamadı. Yükleme sayfasından yeni bir iş başlatın.';
    jobResultEl.classList.add('error');
    copyBtn?.setAttribute('disabled', 'true');
    return;
  }

  const match = jobs.find((job) => job.jobId === jobId);
  if (match) {
    jobResultEl.textContent = `Son iş ID'niz ${jobId}. (${match.fileName})`;
  } else {
    jobResultEl.textContent = `İş ID ${jobId}. Geçmişte saklanan kayıt bulunamadı ama ID geçerlidir.`;
  }
  jobResultEl.classList.remove('error');
  copyBtn?.removeAttribute('disabled');
}

const storedJobs = getStoredJobs();
renderHistory(storedJobs);
const params = new URLSearchParams(window.location.search);
const currentJobId = params.get('jobId') || (storedJobs[0] && storedJobs[0].jobId);
showJob(currentJobId, storedJobs);

copyBtn?.addEventListener('click', async () => {
  if (!currentJobId) return;
  try {
    await navigator.clipboard.writeText(currentJobId);
    copyBtn.textContent = 'Kopyalandı!';
    setTimeout(() => {
      copyBtn.textContent = "İş ID'sini Kopyala";
    }, 2000);
  } catch (error) {
    alert('Kopyalama başarısız: ' + error.message);
  }
});
