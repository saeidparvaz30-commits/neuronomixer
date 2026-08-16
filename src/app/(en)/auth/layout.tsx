import ReCaptchaProviderClient from "@/components/appSkeleton/ReCaptchaProviderClient";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ReCaptchaProviderClient>{children}</ReCaptchaProviderClient>;
}
