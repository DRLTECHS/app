const aiInput = document.getElementById('aiInput');
const aiSend = document.getElementById('aiSend');
const aiChat = document.getElementById('aiChat');
const promptButtons = document.querySelectorAll('.prompt-chip');

const addAiMessage = (sender, text) => {
  if (!aiChat) return;

  const message = document.createElement('div');
  message.className = `message ${sender}`;
  message.innerHTML = `
    <span class="user-tag">${sender === 'bot' ? 'DRL AI' : 'You'}</span>
    <p>${text}</p>
  `;
  aiChat.appendChild(message);
  aiChat.scrollTop = aiChat.scrollHeight;
};

const formatPeso = (value) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getAiReply = (input, context = {}) => {
  const query = input.toLowerCase();
  const clientName = context.name || 'Client';
  const projectType = context.projectType || 'custom digital project';

  if (!input.trim()) {
    return 'Tell me a little about your project, and I can guide you in the right direction.';
  }

  if (query.includes('contract') || query.includes('nda') || query.includes('agreement')) {
    const draftBudget = context.budget || 35000;
    return `I can prepare a professional contract and NDA for ${clientName} for a ${projectType}. The draft will include: project scope and deliverables, payment schedule, milestones, confidentiality clause, intellectual property ownership, dispute resolution, termination terms, and signatory authorization. Estimated project value: ${formatPeso(draftBudget)}. Company signatory: Den Russell Leonardo, President of DRL Techs Computer Software Trading / DRL Solutions.`;
  }

  if (query.includes('website') || query.includes('landing page') || query.includes('company site')) {
    return `A custom business website typically starts around ${formatPeso(25000)} for a clean corporate site and can go higher depending on pages, animations, e-commerce, and backend features. For ${projectType}, I can prepare a contract summary with the scope, phases, and payment terms.`;
  }

  if (query.includes('gam') || query.includes('sabong') || query.includes('casino') || query.includes('bet')) {
    return `A gaming or sabong betting platform usually starts at ${formatPeso(80000)} and can increase based on live features, wallet, admin management, security, and third-party integrations. I can also draft the NDA, project proposal, and full contract structure for that scope.`;
  }

  if (query.includes('app') || query.includes('mobile')) {
    return `A custom mobile app typically ranges from ${formatPeso(35000)} to ${formatPeso(180000)} depending on the number of screens, features, admin dashboard, and deployment needs. I can prepare the formal project agreement and NDA for the selected scope.`;
  }

  if (query.includes('price') || query.includes('cost') || query.includes('budget')) {
    return `Pricing in Philippine pesos depends on scope and complexity. A basic website may start at ${formatPeso(25000)}, a custom app at ${formatPeso(35000)}, and a large platform at ${formatPeso(80000)} or more. I can also prepare a professional contract and NDA based on your preferred budget and requirements.`;
  }

  if (query.includes('ai') || query.includes('automation')) {
    return 'AI can support customer service, project onboarding, smart recommendations, and internal automation. DRL Techs can help you build AI-ready workflows and business tools that increase efficiency.';
  }

  if (query.includes('hello') || query.includes('hi')) {
    return 'Hello! I am DRL AI. I can help you explore website builds, software projects, gaming platforms, pricing in PHP, contract drafts, and NDA preparations.';
  }

  return `Thanks for that. DRL Techs can shape your ${projectType} into a real product, including a clear proposal, pricing estimate in PHP, contract summary, and NDA draft for ${clientName}.`;
};

const handleAiSubmit = () => {
  if (!aiInput || !aiChat) return;

  const value = aiInput.value.trim();
  if (!value) return;

  const formName = document.querySelector('#contactForm input[name="name"]');
  const formProject = document.querySelector('#contactForm select[name="projectType"]');
  const nameValue = formName ? (formName.value || '').trim() : '';
  const projectValue = formProject ? (formProject.value || '').trim() : '';

  addAiMessage('user', value);
  aiInput.value = '';

  const reply = getAiReply(value, {
    name: nameValue || 'Client',
    projectType: projectValue || 'custom digital project',
    budget: projectValue && projectValue.toLowerCase().includes('website') ? 25000 : projectValue && (projectValue.toLowerCase().includes('game') || projectValue.toLowerCase().includes('platform')) ? 80000 : 35000
  });
  setTimeout(() => addAiMessage('bot', reply), 350);
};

if (aiSend) {
  aiSend.addEventListener('click', handleAiSubmit);
}

if (aiInput) {
  aiInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleAiSubmit();
    }
  });
}

promptButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const prompt = button.dataset.prompt || '';
    if (!prompt) return;
    aiInput.value = prompt;
    handleAiSubmit();
  });
});

const contractForm = document.getElementById('aiContractForm');
const contractDraftOutput = document.getElementById('contractDraftOutput');
const contractFormStatus = document.getElementById('contractFormStatus');
const clientPipeline = document.getElementById('clientPipeline');
const clientSignatureName = document.getElementById('clientSignatureName');
const saveContractBtn = document.getElementById('saveContractBtn');
const printContractBtn = document.getElementById('printContractBtn');

const buildContractMarkup = () => {
  if (!contractForm || !contractDraftOutput) return '';

  const formData = new FormData(contractForm);
  const clientName = ((formData.get('clientName') || '').toString().trim()) || (clientSignatureName ? (clientSignatureName.value || '').trim() : '') || 'Client';
  const projectType = (formData.get('projectType') || '').toString().trim();
  const budget = Number(formData.get('budget') || 0);
  const timeline = (formData.get('timeline') || '').toString().trim();
  const projectDetails = (formData.get('projectDetails') || '').toString().trim();
  const estimatedBudget = budget > 0 ? budget : projectType.toLowerCase().includes('website') ? 25000 : projectType.toLowerCase().includes('game') || projectType.toLowerCase().includes('bet') ? 80000 : projectType.toLowerCase().includes('app') ? 35000 : 40000;

  return `
    <div class="contract-print">
      <h3>DRL Techs Computer Software Trading</h3>
      <p>Also known as DRL Solutions</p>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Project type:</strong> ${projectType || 'Custom project'}</p>
      <p><strong>Estimated budget:</strong> ${formatPeso(estimatedBudget)}</p>
      <p><strong>Timeline:</strong> ${timeline || 'To be finalized'}</p>
      <p><strong>Project overview:</strong> ${projectDetails || 'Project details not provided yet.'}</p>
      <p><strong>Confidentiality:</strong> This agreement protects all intellectual, technical, and business information shared by the client and requires all parties to use the information strictly for project evaluation and development.</p>
      <p><strong>Company signatory:</strong> Den Russell Leonardo, President of DRL Techs Computer Software Trading / DRL Solutions.</p>
      <p><strong>Client signatory:</strong> ${clientSignatureName ? (clientSignatureName.value || '__________________') : '__________________'}</p>
      <p>__________________________</p>
      <p>Signature / Date</p>
    </div>
  `;
};

const pipelineStages = [
  { label: 'Inquiry received', className: 'pipeline-inquiry' },
  { label: 'NDA accepted', className: 'pipeline-nda' },
  { label: 'Contract ready', className: 'pipeline-contract' },
  { label: 'Development stage', className: 'pipeline-develop' }
];

const renderPipeline = () => {
  if (!clientPipeline) return;

  const existing = JSON.parse(localStorage.getItem('drlClientPipeline') || '[]');

  if (!existing.length) {
    clientPipeline.innerHTML = '<li><span class="pipeline-dot pipeline-inquiry"></span> No clients yet</li>';
    return;
  }

  clientPipeline.innerHTML = existing
    .slice(0, 4)
    .map((item) => `<li><span class="pipeline-dot ${item.color}"></span>${item.label}</li>`)
    .join('');
};

if (contractForm && contractDraftOutput) {
  contractForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(contractForm);
    const clientName = (data.get('clientName') || '').toString().trim();
    const projectType = (data.get('projectType') || '').toString().trim();
    const budget = Number(data.get('budget') || 0);
    const timeline = (data.get('timeline') || '').toString().trim();
    const projectDetails = (data.get('projectDetails') || '').toString().trim();
    const ndaAccepted = data.get('ndaAccepted');

    if (!clientName || !projectType || !projectDetails) {
      if (contractFormStatus) {
        contractFormStatus.textContent = 'Please complete the client name, project type, and project details.';
        contractFormStatus.style.color = '#f4c95d';
      }
      return;
    }

    if (!ndaAccepted) {
      if (contractFormStatus) {
        contractFormStatus.textContent = 'Please accept the NDA workflow before generating the contract summary.';
        contractFormStatus.style.color = '#f4c95d';
      }
      return;
    }

    const estimatedBudget = budget > 0 ? budget : projectType.toLowerCase().includes('website') ? 25000 : projectType.toLowerCase().includes('game') || projectType.toLowerCase().includes('bet') ? 80000 : projectType.toLowerCase().includes('app') ? 35000 : 40000;

    const summary = `
      <strong>Client:</strong> ${clientName}<br>
      <strong>Project type:</strong> ${projectType}<br>
      <strong>Estimated budget:</strong> ${formatPeso(estimatedBudget)}<br>
      <strong>Timeline:</strong> ${timeline || 'To be finalized'}<br>
      <strong>Project overview:</strong> ${projectDetails}<br><br>
      <strong>Contract clauses included:</strong><br>
      - Scope of work and deliverables<br>
      - Project milestones and review checkpoints<br>
      - Confidentiality and NDA obligations<br>
      - Intellectual property ownership and licensing terms<br>
      - Payment schedule and contract validity<br>
      - Company signatory: Den Russell Leonardo, President of DRL Techs Computer Software Trading / DRL Solutions.<br><br>
      <strong>Recommended next step:</strong> Sign the NDA, approve the proposal, and finalize the contract before project execution begins.
    `;

    contractDraftOutput.innerHTML = summary;

    if (clientSignatureName && !clientSignatureName.value) {
      clientSignatureName.value = clientName;
    }

    const pipeline = pipelineStages.map((stage) => ({
      label: `${clientName} — ${stage.label}`,
      color: stage.className
    }));

    localStorage.setItem('drlClientPipeline', JSON.stringify(pipeline));
    renderPipeline();

    if (contractFormStatus) {
      contractFormStatus.textContent = 'Contract summary generated successfully.';
      contractFormStatus.style.color = '#4dd4a5';
    }
  });
}

if (saveContractBtn) {
  saveContractBtn.addEventListener('click', () => {
    const contractHtml = buildContractMarkup();
    if (!contractHtml) return;

    const blob = new Blob([contractHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drl-contract.html';
    link.click();
    URL.revokeObjectURL(url);
  });
}

if (printContractBtn) {
  printContractBtn.addEventListener('click', () => {
    const contractHtml = buildContractMarkup();
    if (!contractHtml) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>DRL Contract</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h3 { margin-bottom: 8px; }
            p { margin: 10px 0; line-height: 1.6; }
            .contract-print { max-width: 760px; margin: 0 auto; }
          </style>
        </head>
        <body>
          ${contractHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  });
}

renderPipeline();

const form = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const yearEl = document.getElementById('year');
const ndaPreview = document.getElementById('ndaPreview');

const renderNdaPreview = (name = 'Customer', projectType = 'digital project') => {
  if (!ndaPreview) return;

  const customerName = name || 'Customer';
  const customerProject = projectType || 'digital project';

  ndaPreview.innerHTML = `
    <strong>Non-Disclosure Agreement (NDA)</strong>
    <span>This agreement is generated automatically for <strong>${customerName}</strong> and confirms the confidential nature of the project discussion for the <strong>${customerProject}</strong>.</span>
    <span>DRL Techs Computer Software Trading, also known as DRL Solutions, agrees to protect all shared business, technical, and strategic information disclosed by the client and will use such information only for the purpose of evaluating and developing the requested solution.</span>
    <span><strong>Company Signatory:</strong> Den Russell Leonardo, President, DRL Techs Computer Software Trading / DRL Solutions.</span>
  `;
};

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (form) {
  const nameField = form.querySelector('input[name="name"]');
  const projectField = form.querySelector('select[name="projectType"]');

  const refreshNdaPreview = () => {
    const nameValue = nameField ? (nameField.value || '').trim() : 'Customer';
    const projectValue = projectField ? (projectField.value || '').trim() : 'digital project';
    renderNdaPreview(nameValue, projectValue);
  };

  if (nameField) {
    nameField.addEventListener('input', refreshNdaPreview);
  }

  if (projectField) {
    projectField.addEventListener('change', refreshNdaPreview);
  }

  refreshNdaPreview();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const projectType = (data.get('projectType') || '').toString().trim();
    const details = (data.get('details') || '').toString().trim();
    const ndaAccepted = form.querySelector('#ndaAgreement');

    if (!name || !email || !projectType || !details) {
      formStatus.textContent = 'Please complete the required fields before sending your request.';
      formStatus.style.color = '#f4c95d';
      return;
    }

    if (ndaAccepted && !ndaAccepted.checked) {
      formStatus.textContent = 'Please accept the NDA agreement before submitting your inquiry.';
      formStatus.style.color = '#f4c95d';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      formStatus.textContent = 'Please provide a valid email address.';
      formStatus.style.color = '#f4c95d';
      return;
    }

    const agreement = `NDA accepted for ${name} — ${projectType}. Company signatory: Den Russell Leonardo, President of DRL Techs Computer Software Trading / DRL Solutions.`;

    const summary = [
      'Project inquiry received!',
      `Client: ${name}`,
      `Email: ${email}`,
      `Project type: ${projectType}`,
      agreement,
      'We will contact you soon with next steps.'
    ].join(' ');

    formStatus.textContent = summary;
    formStatus.style.color = '#4dd4a5';
    form.reset();
    refreshNdaPreview();
  });
}

const checkoutButtons = document.querySelectorAll('[data-product]');
if (checkoutButtons.length) {
  checkoutButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const product = button.dataset.product || 'Product';
      const price = Number(button.dataset.price || 0);
      const orderNumber = `DRL-${new Date().getTime().toString().slice(-8)}`;
      const params = new URLSearchParams({
        product,
        price: String(price),
        ref: orderNumber,
        qty: '1'
      });
      window.location.href = `checkout.html?${params.toString()}`;
    });
  });
}

const checkoutPage = document.body.dataset.page === 'checkout';
if (checkoutPage) {
  const params = new URLSearchParams(window.location.search);
  const product = params.get('product') || 'Gaming Device';
  const price = Number(params.get('price') || 0);
  const quantity = Number(params.get('qty') || 1);
  const ref = params.get('ref') || `DRL-${Math.floor(Date.now() / 1000)}`;
  const total = (price * quantity).toFixed(2);

  const summaryEls = {
    product: document.getElementById('checkoutProduct'),
    ref: document.getElementById('checkoutRef'),
    qty: document.getElementById('checkoutQty'),
    total: document.getElementById('checkoutTotal'),
    form: document.getElementById('checkoutForm')
  };

  if (summaryEls.product) summaryEls.product.textContent = product;
  if (summaryEls.ref) summaryEls.ref.textContent = ref;
  if (summaryEls.qty) summaryEls.qty.textContent = String(quantity);
  if (summaryEls.total) summaryEls.total.textContent = `$${total}`;

  const payLink = document.getElementById('swiftpayCheckoutLink');
  if (payLink) {
    const url = new URL('https://pay.swiftpay.ph/checkout');
    url.searchParams.set('ref', ref);
    url.searchParams.set('amount', total);
    url.searchParams.set('product', product);
    payLink.href = url.toString();
  }

  const statusLink = document.getElementById('checkoutStatusLink');
  if (statusLink) {
    statusLink.href = `payment-status.html?ref=${encodeURIComponent(ref)}&product=${encodeURIComponent(product)}`;
  }
}

const statusPage = document.body.dataset.page === 'status';
if (statusPage) {
  const ref = new URLSearchParams(window.location.search).get('ref') || 'DRL-ORDER';
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const statusLabel = document.getElementById('statusLabel');

  if (statusBadge && statusText && statusLabel) {
    statusBadge.textContent = 'Pending';
    statusText.textContent = 'Awaiting payment confirmation from SwiftPay.';
    statusLabel.textContent = `Reference: ${ref}`;

    const refreshBtn = document.getElementById('refreshStatus');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        statusBadge.textContent = 'Paid';
        statusBadge.style.background = 'rgba(74, 222, 128, 0.12)';
        statusBadge.style.color = '#7ae2a7';
        statusText.textContent = 'Payment confirmed successfully. Your order is now being processed.';
      });
    }
  }
}

// ===== Advanced 2080 Scroll Animations =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = entry.target.dataset.animation || 'floatIn 0.8s ease-out forwards';
      entry.target.classList.add('in-view');
      scrollObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all cards for scroll animations
document.querySelectorAll('.service-card, .info-card, .achievement-card, .shop-card, .game-card, .portfolio-card, .timeline-item').forEach(el => {
  scrollObserver.observe(el);
});

// Parallax background on scroll
let scrollY = 0;
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  const bgElement = document.querySelector('body::before');
  if (bgElement) {
    document.body.style.backgroundPosition = `0px ${scrollY * 0.5}px`;
  }
});

// Add subtle mouse tracking glow effect
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  
  const glowElements = document.querySelectorAll('.button-primary, .ai-panel, .service-card:hover');
  glowElements.forEach(el => {
    el.style.setProperty('--mouse-x', `${x}%`);
    el.style.setProperty('--mouse-y', `${y}%`);
  });
});

// Throttled scroll handler for smooth animation triggering
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    document.querySelectorAll('.metric-strip div').forEach((el, idx) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.8) {
        el.style.animation = `floatIn 0.8s ease-out ${idx * 0.08}s forwards`;
      }
    });
  }, 50);
});

// Keyboard interactions for advanced feel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.active-link').forEach(el => el.classList.remove('active-link'));
  }
});

console.log('%c🚀 DRL Techs 2080 Experience Loaded', 'color: #00ffff; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px #00ffff;');
