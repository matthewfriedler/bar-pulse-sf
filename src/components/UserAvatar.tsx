import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
  avatarPath: string | null;
  username: string | null;
  className?: string;
}

export function UserAvatar({ avatarPath, username, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void resolveAvatarUrl(avatarPath).then((next) => {
      if (alive) setUrl(next);
    });
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  return (
    <Avatar className={cn("size-9", className)}>
      {url && <AvatarImage src={url} alt={username ? `${username}'s profile picture` : "Profile picture"} />}
      <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
        {(username ?? "?").slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
