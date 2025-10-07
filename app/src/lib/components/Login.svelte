<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { auth } from '../stores/auth';
  import PullToRefresh from './PullToRefresh.svelte';

  // Event dispatcher for parent component communication
  const dispatch = createEventDispatcher<{
    refresh: void;
    privacyPolicy: void;
  }>();

  // Props
  export let refreshing = false;

  // Local state
  let isLoading = false;
  let errorMessage: string | null = null;
  $: isDisabled = isLoading;

  // Event handlers
  const handleRefresh = async (): Promise<void> => {
    dispatch('refresh');
  };

  const handleGoogleLogin = async (): Promise<void> => {
    if (isDisabled) return;
    
    isLoading = true;
    try {
      const { error } = await auth.signInWithGoogle();
      if (error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  };

  const handleFacebookLogin = async (): Promise<void> => {
    if (isDisabled) return;
    
    isLoading = true;
    try {
      const { error } = await auth.signInWithFacebook();
      if (error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  };

  const handlePrivacyPolicy = (): void => {
    dispatch('privacyPolicy');
  };
  </script>

<PullToRefresh onRefresh={handleRefresh} {refreshing} useLoginBackground={true}>
  <main class="min-h-screen flex items-center justify-center p-8 relative overflow-hidden font-sans" 
        style="background: linear-gradient(135deg, #000F26 0%, #001734 25%, #003257 50%, #00294C 75%, #011129 100%), radial-gradient(ellipse at center, rgba(0, 41, 76, 0.3) 0%, transparent 70%);">
    <!-- Background animation overlay -->
    <div class="absolute inset-0 opacity-100" 
         style="background: radial-gradient(circle at 20% 80%, rgba(0, 41, 76, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 50, 87, 0.2) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(0, 23, 52, 0.15) 0%, transparent 50%); animation: float 6s ease-in-out infinite;">
    </div>
    
    <!-- DaisyUI Card Component -->
    <div class="card w-full max-w-sm bg-base-100/10 backdrop-blur-xl shadow-2xl border border-primary/20 rounded-3xl">
      <div class="card-body p-8 space-y-6">
        <!-- Title Section -->
        <div class="text-center">
          <h1 class="card-title text-3xl font-bold text-white justify-center" style="color: white !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">
            SuperHOME Scheduler
          </h1>
        </div>

        <!-- Login Section -->
        <div class="space-y-4">
          {#if errorMessage}
            <div class="alert alert-error text-sm" role="alert" aria-live="polite">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          {/if}
          
          <!-- Google Login Button -->
          <button 
            type="button"
            class="btn bg-white text-black border-[#e5e5e5] w-full h-12 text-base font-medium gap-3"
            on:click={handleGoogleLogin}
            disabled={isDisabled}
            aria-label="Sign in with Google"
          >
            <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <g>
                <path d="m0 0H512V512H0" fill="#fff"></path>
                <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path>
                <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path>
                <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
                <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path>
              </g>
            </svg>
            Login with Google
          </button>

          <!-- Facebook Login Button -->
          <button 
            type="button"
            class="btn bg-[#1A77F2] text-white border-[#005fd8] w-full h-12 text-base font-medium gap-3 mt-2"
            on:click={handleFacebookLogin}
            disabled={isDisabled}
            aria-label="Sign in with Facebook"
          >
            <svg aria-label="Facebook logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"></path>
            </svg>
            Login with Facebook
          </button>
        </div>

        <!-- Privacy Policy Section -->
        <div class="text-center">
          <button
            type="button"
            class="btn btn-link text-white text-sm font-medium no-underline hover:no-underline p-0"
            style="color: white !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);"
            on:click={handlePrivacyPolicy}
            aria-label="View Privacy Policy"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  </main>
</PullToRefresh>

<style>
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(1deg); }
  }
  
  /* Force white text color for title and subtitle */
  h1 {
    color: white !important;
  }
  
  /* DaisyUI Card Customization */
  .card {
    border-radius: 2rem;
    background: rgba(0, 41, 76, 0.1) !important;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 15, 38, 0.4), inset 0 1px 0 rgba(0, 50, 87, 0.1);
  }
  
  .card-body {
    padding: 2rem;
  }
  
  /* Desktop and tablet adjustments */
  @media (min-width: 769px) {
    main {
      padding: 2rem;
    }
    
    .card {
      max-width: 400px;
    }
    
    .card-body {
      padding: 3rem 2rem;
    }
    
    /* Larger title for desktop */
    h1 {
      font-size: 1.5rem;
    }
    
    /* Adjust spacing for larger screens */
    .card-body.space-y-6 > * + * {
      margin-top: 1.75rem;
    }
  }
  
  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    main {
      padding: 1.5rem;
    }
    
    .card {
      max-width: 350px;
    }
    
    .card-body {
      padding: 2.5rem 1.5rem;
    }
    
    h1 {
      font-size: 1.75rem;
    }
    
    /* Maintain consistent spacing on mobile */
    .card-body.space-y-6 > * + * {
      margin-top: 1.5rem;
    }
  }
  
  @media (max-width: 480px) {
    main {
      padding: 1rem;
    }
    
    .card {
      max-width: 320px;
    }
    
    .card-body {
      padding: 2rem 1.5rem;
    }
    
    h1 {
      font-size: 1.5rem;
    }
    
    .btn {
      min-height: 44px;
      font-size: 0.9rem;
    }
    
    /* Tighter spacing for small screens */
    .card-body.space-y-6 > * + * {
      margin-top: 1.25rem;
    }
  }
  
  @media (max-width: 360px) {
    main {
      padding: 0.75rem;
    }
    
    .card {
      max-width: 300px;
    }
    
    .card-body {
      padding: 1.5rem 1rem;
    }
    
    h1 {
      font-size: 1.25rem;
    }
    
    .btn {
      min-height: 42px;
      font-size: 0.85rem;
    }
    
    /* Minimal spacing for very small screens */
    .card-body.space-y-6 > * + * {
      margin-top: 1rem;
    }
  }
</style>
