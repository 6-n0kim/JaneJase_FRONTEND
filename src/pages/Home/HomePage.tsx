import { useEffect } from 'react';
import { Button } from '@/components/common/Button/Button';
import useGoogleStore from '@/stores/useAuthStore';
import tempImg from '@/assets/imgs/poseDetection.png';
import panda from '@/assets/imgs/panda.png';
import { useNavigate } from 'react-router-dom';
import { Camera, Lock, Activity, ShieldCheck } from 'lucide-react';

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 p-3 bg-primary/10 rounded-xl">{icon}</div>
      <h4 className="text-xl font-bold text-text mb-3">{title}</h4>
      <p className="text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-surface z-10 w-full md:w-1/3">
      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-4 shadow-lg">
        {step}
      </div>
      <h4 className="text-lg font-bold text-text mb-2">{title}</h4>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, fetchUser, token } = useGoogleStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  const handleGuestLogin = () => {
    navigate('/pose/init');
  };

  const HandlePoseWebcam = () => {
    if (isAuthenticated && user) {
      navigate('/pose/init');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative -m-6 flex min-h-[calc(100vh-88px)] w-[calc(100%+48px)] flex-col overflow-hidden">
      {/* Main Content */}
      <div className="layout-container relative flex h-full grow flex-col">
        {/* Background Blobs */}
        <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[50%] w-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[100px]"></div>

        <div className="z-10 flex flex-1 flex-col items-center px-4 py-10 md:px-40 md:py-20 gap-20">
          <div className="layout-content-container flex max-w-[960px] flex-1 flex-col items-center justify-center">
            <div className="w-full @container">
              <div className="flex flex-col items-center @[480px]:p-4">
                {/* Hero Section */}
                <div className="flex max-w-3xl flex-col items-center justify-center gap-8 text-center">
                  <div className="flex flex-row items-center gap-4">
                    <img
                      src={panda}
                      alt="JaneJase Logo"
                      className="h-32 w-auto object-contain md:h-48 lg:h-64"
                    />
                    <div>
                      <h1 className="max-w-xl break-keep text-4xl font-extrabold leading-tight text-text md:text-5xl lg:text-6xl">
                        JaneJase
                      </h1>
                      <h2 className="max-w-xl break-keep text-lg font-normal leading-relaxed text-text-muted md:text-xl">
                        <br className="hidden sm:block" />
                        자네, 자세가 그게 뭔가?
                      </h2>
                    </div>
                  </div>

                  {/* CTA Section */}
                  <div className="flex w-full flex-col items-center gap-4 sm:w-auto">
                    <Button
                      size="lg"
                      variant="primary"
                      onClick={HandlePoseWebcam}
                      className="w-full min-w-[200px] sm:w-auto shadow-lg hover:shadow-xl transition-all"
                    >
                      자세 교정하러 가기
                    </Button>
                    <Button
                      size="lg"
                      variant="primary"
                      onClick={handleGuestLogin}
                      className="w-full min-w-[200px] sm:w-auto shadow-md hover:shadow-lg transition-all"
                    >
                      게스트로 이용
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-success-soft px-4 py-1.5 text-center text-xs font-normal leading-normal text-success mt-2">
            <ShieldCheck className="w-4 h-4" />
            <p>영상은 서버에 저장되지 않습니다. 개인정보는 안전합니다.</p>
          </div>

          {/* Features Section */}
          <div className="w-full max-w-6xl px-4 py-12">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-text mb-12">
              왜 <span className="text-primary">JaneJase</span>인가요?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Camera className="w-10 h-10 text-primary" />}
                title="실시간 AI 교정"
                description="웹캠 하나로 별도 장비 없이 실시간으로 자세를 분석하고 피드백을 제공합니다."
              />
              <FeatureCard
                icon={<Lock className="w-10 h-10 text-primary" />}
                title="철저한 프라이버시"
                description="모든 영상 처리는 브라우저에서 이루어집니다. 영상 데이터는 절대 서버로 전송되지 않습니다."
              />
              <FeatureCard
                icon={<Activity className="w-10 h-10 text-primary" />}
                title="습관 형성 리포트"
                description="로그인 시 사용자의 자세 데이터를 누적하여 일별, 주별 통계와 리포트를 제공합니다."
              />
            </div>
          </div>
          {/* Demo Card */}
          <div className="group perspective-[1000px] relative mt-16 w-full max-w-4xl">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-text mb-12">
              화면 예시
            </h3>
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
              {/* Window Controls */}
              <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/80"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400/80"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400/80"></div>
                </div>
                <div className="flex-1 text-center text-xs font-medium tracking-widest text-muted-foreground">
                  AI POSE CORRECTION
                </div>
              </div>

              {/* Demo Content */}
              <div className="relative w-full aspect-video overflow-hidden bg-black">
                <img
                  src={tempImg}
                  alt="Pose Detection Demo"
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="w-full max-w-6xl px-4 py-12 bg-surface-muted/30 rounded-3xl">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-text mb-12">
              어떻게 사용하나요?
            </h3>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10 -translate-y-1/2" />

              <StepCard
                step="01"
                title="접속 및 로그인"
                description="게스트로 빠르게 시작하거나 구글 로그인으로 기록을 관리하세요."
              />
              <StepCard
                step="02"
                title="웹캠 권한 허용"
                description="자세 인식을 위해 브라우저의 카메라 권한을 허용해주세요."
              />
              <StepCard
                step="03"
                title="바른 자세 유지"
                description="AI가 알려주는 가이드에 따라 거북목과 어깨 균형을 바로잡으세요."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
