import { useState, useRef, useCallback, useEffect } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Pose3DRenderer } from '../Pose3DRenderer';
import type { Pose2DRendererRef } from '../Pose2DRenderer';
import type { Pose3DRendererRef } from '../Pose3DRenderer';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import {
  CurrentStatusCard,
  TodayStatsCard,
  StretchingReminderCard,
  VideoFeedSection,
} from './components';
import type { LocationState, detectBadPoseInform } from '@/types/poseTypes';
import {
  getCenter,
  dist2D,
  detectBadPose,
  noseToShoulderDegree,
  earsToShoulderDegree,
  shoulderLeanDegree,
} from '@/utils/detectPose';

export default function DashboardPage() {
  const location = useLocation();
  const state = location.state as LocationState;
  const standardData = state?.measurementData;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pose2DRef = useRef<Pose2DRendererRef | null>(null);
  const pose3DRef = useRef<Pose3DRendererRef | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const runningRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);

  const [poseData, setPoseData] = useState<any>(null);

  const [currentStatus, setCurrentStatus] =
    useState<detectBadPoseInform | null>(null);

  // 지표 계산용 EMA(landmark 흔들림 감소)
  const ema2DRef = useRef<Float32Array | null>(null);
  const ema2DInitedRef = useRef(false);

  function emaSmooth2DLandmarks(
    lm: Array<{
      x: number;
      y: number;
      z?: number;
      visibility?: number;
      presence?: number;
    }>,
    alpha = 0.25,
    minConf = 0.5
  ) {
    const n = lm.length;
    const needed = n * 3;

    if (!ema2DRef.current || ema2DRef.current.length !== needed) {
      ema2DRef.current = new Float32Array(needed);
      ema2DInitedRef.current = false;
    }

    const buf = ema2DRef.current;

    if (!ema2DInitedRef.current) {
      for (let i = 0; i < n; i++) {
        const p = lm[i];
        buf[i * 3 + 0] = p.x;
        buf[i * 3 + 1] = p.y;
        buf[i * 3 + 2] = p.z ?? 0;
      }
      ema2DInitedRef.current = true;
    } else {
      for (let i = 0; i < n; i++) {
        const p = lm[i];
        const conf = Math.min(p.visibility ?? 1, p.presence ?? 1);
        if (conf < minConf) continue;
        const ix = i * 3;
        buf[ix + 0] = alpha * p.x + (1 - alpha) * buf[ix + 0];
        buf[ix + 1] = alpha * p.y + (1 - alpha) * buf[ix + 1];
        buf[ix + 2] = alpha * (p.z ?? 0) + (1 - alpha) * buf[ix + 2];
      }
    }

    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      out[i] = {
        x: buf[ix + 0],
        y: buf[ix + 1],
        z: buf[ix + 2],
        visibility: lm[i].visibility,
        presence: lm[i].presence,
      };
    }
    return out;
  }

  // MediaPipe 초기화
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (mounted) {
          landmarkerRef.current = landmarker;
          setIsReady(true);
        }
      } catch (e) {
        console.error('MediaPipe 초기화 실패:', e);
        if (mounted) {
          setErrorMessage('MediaPipe 로딩에 실패했습니다.');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 웹캠 자동 시작
  useEffect(() => {
    if (!isReady || runningRef.current) return;

    (async () => {
      if (!landmarkerRef.current) {
        return;
      } else {
        console.log('standardData : ', standardData);
      }

      try {
        const video = videoRef.current!;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        video.srcObject = stream;

        await video.play().catch(() => {});

        // 비디오 메타데이터 준비 대기
        await new Promise<void>(resolve => {
          const onLoadedMetadata = () => {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;

            // 2D 캔버스 크기 설정
            pose2DRef.current?.setCanvasSize(vw, vh);
            resolve();
          };

          if (video.readyState >= 1) onLoadedMetadata();
          else
            video.addEventListener('loadedmetadata', onLoadedMetadata, {
              once: true,
            });
        });

        runningRef.current = true;
        setRunning(true);

        const predict = () => {
          if (!landmarkerRef.current || !videoRef.current) {
            return;
          }
          if (!runningRef.current) return;

          const video = videoRef.current;

          if (video.readyState < 2) {
            rafRef.current = requestAnimationFrame(predict);
            return;
          }

          const nowVideoTime = video.currentTime;
          const nowMs = performance.now();

          if (lastVideoTimeRef.current !== nowVideoTime) {
            lastVideoTimeRef.current = nowVideoTime;

            landmarkerRef.current.detectForVideo(video, nowMs, result => {
              // 2D 랜드마크 업데이트
              const lm2d = result.landmarks?.[0];
              if (lm2d && lm2d.length && standardData) {
                pose2DRef.current?.updateLandmarks(lm2d as any);

                // 지표 계산은 EMA로 한 번 더 안정화된 값을 사용
                const smoothedLm = emaSmooth2DLandmarks(lm2d as any, 0.25, 0.5);

                // 팔을 들었는지(손/팔 동작) 감지: 손 들기 때 어깨 landmark가 흔들리며 기울기 오탐 방지
                // y는 아래로 증가이므로 "손이 어깨보다 위" => wrist.y < shoulder.y
                const armMargin = 0.02;
                const leftArmRaised =
                  (smoothedLm[15]?.y ?? 1) <
                    (smoothedLm[11]?.y ?? 1) - armMargin ||
                  (smoothedLm[13]?.y ?? 1) <
                    (smoothedLm[11]?.y ?? 1) - armMargin;
                const rightArmRaised =
                  (smoothedLm[16]?.y ?? 1) <
                    (smoothedLm[12]?.y ?? 1) - armMargin ||
                  (smoothedLm[14]?.y ?? 1) <
                    (smoothedLm[12]?.y ?? 1) - armMargin;
                const armsRaised = leftArmRaised || rightArmRaised;

                // 원하시는 형식으로 데이터 변환
                const formattedData = {
                  nose: {
                    x: smoothedLm[0].x,
                    y: smoothedLm[0].y,
                    z: smoothedLm[0].z,
                  },
                  leftEyeInner: { x: lm2d[1].x, y: lm2d[1].y, z: lm2d[1].z },
                  leftEye: { x: lm2d[2].x, y: lm2d[2].y, z: lm2d[2].z },
                  leftEyeOuter: { x: lm2d[3].x, y: lm2d[3].y, z: lm2d[3].z },
                  rightEyeInner: { x: lm2d[4].x, y: lm2d[4].y, z: lm2d[4].z },
                  rightEye: { x: lm2d[5].x, y: lm2d[5].y, z: lm2d[5].z },
                  rightEyeOuter: { x: lm2d[6].x, y: lm2d[6].y, z: lm2d[6].z },
                  leftEar: {
                    x: smoothedLm[7].x,
                    y: smoothedLm[7].y,
                    z: smoothedLm[7].z,
                  },
                  rightEar: {
                    x: smoothedLm[8].x,
                    y: smoothedLm[8].y,
                    z: smoothedLm[8].z,
                  },
                  mouthLeft: { x: lm2d[9].x, y: lm2d[9].y, z: lm2d[9].z },
                  mouthRight: { x: lm2d[10].x, y: lm2d[10].y, z: lm2d[10].z },
                  leftShoulder: {
                    x: smoothedLm[11].x,
                    y: smoothedLm[11].y,
                    z: smoothedLm[11].z,
                  },
                  rightShoulder: {
                    x: smoothedLm[12].x,
                    y: smoothedLm[12].y,
                    z: smoothedLm[12].z,
                  },
                  leftHip: {
                    x: smoothedLm[23].x,
                    y: smoothedLm[23].y,
                    z: smoothedLm[23].z,
                  },
                  rightHip: {
                    x: smoothedLm[24].x,
                    y: smoothedLm[24].y,
                    z: smoothedLm[24].z,
                  },
                };

                const formattedDataShoulderCenter = getCenter(
                  formattedData.leftShoulder,
                  formattedData.rightShoulder
                );
                const formattedShoulderWidth = dist2D(
                  formattedData.leftShoulder,
                  formattedData.rightShoulder
                );

                const SNTSD = noseToShoulderDegree(
                  standardData.nose,
                  standardData.shoulderCenter,
                  standardData.shoulderWidth
                );
                const FNTSD = noseToShoulderDegree(
                  formattedData.nose,
                  formattedDataShoulderCenter,
                  formattedShoulderWidth
                );
                const SETSD = earsToShoulderDegree(
                  standardData.leftEar,
                  standardData.rightEar,
                  standardData.shoulderCenter,
                  standardData.shoulderWidth
                );
                const FETSD = earsToShoulderDegree(
                  formattedData.leftEar,
                  formattedData.rightEar,
                  formattedDataShoulderCenter,
                  formattedShoulderWidth
                );
                const SSLD = shoulderLeanDegree(
                  standardData.leftShoulder,
                  standardData.rightShoulder,
                  standardData.leftHip,
                  standardData.rightHip,
                  false
                );
                const FSLD = shoulderLeanDegree(
                  formattedData.leftShoulder,
                  formattedData.rightShoulder,
                  formattedData.leftHip,
                  formattedData.rightHip,
                  armsRaised
                );

                const inform = detectBadPose(
                  SNTSD, // standardNSDegree
                  SETSD, // standardESDegree
                  SSLD, // standardShoulderLeanDegree
                  FNTSD, // currentNSDegree
                  FETSD, // currentESDegree
                  FSLD // currentShoulderLeanDegree
                );
                if (inform) {
                  setCurrentStatus(inform);
                }

                setPoseData(formattedData);
                // console.log("SNTSD:", SNTSD, "FNTSD:", FNTSD, "SETSD:", SETSD, "FETSD:", FETSD, "SSLD:", SSLD, "FSLD:", FSLD);
                // console.log('inform in useEffect:', inform);
              }

              // 3D 월드 랜드마크 업데이트
              const lm3d = result.worldLandmarks?.[0];
              if (lm3d && lm3d.length) {
                pose3DRef.current?.updateWorldLandmarks(lm3d as any);
              }
            });
          }

          rafRef.current = requestAnimationFrame(predict);
        };

        rafRef.current = requestAnimationFrame(predict);
      } catch (e) {
        console.error(e);
        const errorMsg = '웹캠 권한이 필요합니다(브라우저/OS 설정 확인).';
        setErrorMessage(errorMsg);
        runningRef.current = false;
        setRunning(false);
      }
    })();
  }, [isReady, standardData]);

  // 시작 함수
  async function start() {
    if (runningRef.current) return;
    if (!landmarkerRef.current) {
      return;
    }

    try {
      const video = videoRef.current!;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;

      await video.play().catch(() => {});

      // 비디오 메타데이터 준비 대기
      await new Promise<void>(resolve => {
        const onLoadedMetadata = () => {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;

          // 2D 캔버스 크기 설정
          pose2DRef.current?.setCanvasSize(vw, vh);

          resolve();
        };

        if (video.readyState >= 1) onLoadedMetadata();
        else
          video.addEventListener('loadedmetadata', onLoadedMetadata, {
            once: true,
          });
      });

      runningRef.current = true;
      setRunning(true);

      const predict = () => {
        if (!landmarkerRef.current || !videoRef.current) {
          return;
        }
        if (!runningRef.current) return;

        const video = videoRef.current;

        if (video.readyState < 2) {
          rafRef.current = requestAnimationFrame(predict);
          return;
        }

        const nowVideoTime = video.currentTime;
        const nowMs = performance.now();

        if (lastVideoTimeRef.current !== nowVideoTime) {
          lastVideoTimeRef.current = nowVideoTime;

          landmarkerRef.current.detectForVideo(video, nowMs, result => {
            // 2D 랜드마크 업데이트
            const lm2d = result.landmarks?.[0];
            if (lm2d && lm2d.length) {
              pose2DRef.current?.updateLandmarks(lm2d as any);
            }

            // 3D 월드 랜드마크 업데이트
            const lm3d = result.worldLandmarks?.[0];
            if (lm3d && lm3d.length) {
              pose3DRef.current?.updateWorldLandmarks(lm3d as any);
            }
          });
        }

        rafRef.current = requestAnimationFrame(predict);
      };

      rafRef.current = requestAnimationFrame(predict);
    } catch (e) {
      console.error(e);
      const errorMsg = '웹캠 권한이 필요합니다(브라우저/OS 설정 확인).';
      setErrorMessage(errorMsg);
      runningRef.current = false;
      setRunning(false);
    }
  }
  // 일시 정지 콜백
  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 렌더러 클리어
    pose2DRef.current?.clear();
    pose3DRef.current?.clear();
  }, []);
  const todayStats = {
    warnings: 3,
    focusTime: 42,
  };

  return (
    <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* 왼쪽 사이드바 */}
      <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
        <CurrentStatusCard detectBadPoseInform={currentStatus!} />

        <TodayStatsCard
          warnings={todayStats.warnings}
          focusTime={todayStats.focusTime}
        />
        <StretchingReminderCard />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="lg:col-span-9 flex flex-col h-full order-1 lg:order-2">
        <button
          className="top-4 right-4 z-50"
          onClick={() => setDeveloperMode(!developerMode)}
        >
          디버깅용 버튼{' '}
        </button>
        <VideoFeedSection
          videoRef={videoRef}
          pose2DRef={pose2DRef}
          running={running}
          start={start}
          stop={stop}
        />

        {/* 3D Pose Renderer (개발자 모드) */}
        <div
          className={`mt-6 overflow-hidden rounded-xl border border-border bg-bg shadow-soft ${
            developerMode ? '' : 'hidden'
          }`}
        >
          <div className="border-b border-border px-4 py-3 text-sm text-text-muted">
            3D Pose View (worldLandmarks)
          </div>
          <Pose3DRenderer ref={pose3DRef} className="h-[480px] w-full" />
        </div>

        {/* 실시간 포즈 데이터 표시 (개발자 모드) */}
        <div
          className={`mt-6 overflow-hidden rounded-xl border border-border bg-bg shadow-soft ${
            developerMode ? '' : 'hidden'
          }`}
        >
          <div className="border-b border-border px-4 py-3 text-sm text-text-muted">
            실시간 포즈 데이터
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            {poseData ? (
              <pre className="text-xs text-text-muted">
                {JSON.stringify(poseData, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-text-muted">
                포즈 데이터를 기다리는 중...
              </p>
            )}
          </div>
        </div>

        {/* Error Modal */}
        <Modal
          open={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          title="오류 발생"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-text-muted">{errorMessage}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setErrorModalOpen(false)}
              >
                확인
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
