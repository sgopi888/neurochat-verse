
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const DISCLAIMER_TEXT = `The mindfulness-based processes, meditative techniques, and spiritual practices shared through this platform are intended solely for purposes of inner reflection, personal insight, emotional balance, and general well-being. These offerings are not medical, clinical, or psychotherapeutic in nature, and they do not constitute treatment, diagnosis, or advice for any mental or physical health condition.

We do not provide any form of medical service, therapy, crisis intervention, or emergency care. These practices are not intended to replace professional medical or mental health support, and should not be used as a substitute for care from a licensed healthcare provider, particularly in cases involving trauma, chronic illness, terminal diagnosis, sexually transmitted disease, or issues surrounding death and dying.

DATA RETENTION AND PRIVACY: Your chat history is automatically retained for 90 days in our secure database for security and safety purposes, after which it is permanently deleted. When you clear your chat history, the data is hidden from your view but remains securely stored for this 90-day period before automatic permanent deletion. This retention policy helps ensure platform security and user safety.

Participation is voluntary, and any insights or outcomes experienced are the sole responsibility of the individual. If you are experiencing a health crisis, psychological distress, or suicidal thoughts, we strongly urge you to contact a qualified professional or emergency services in your area.

By engaging with our content, you agree to assume full responsibility for your well-being and understand that the facilitators and platform creators are not liable for any outcomes associated with the use or interpretation of these mindfulness practices.`;

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onAccept,
  onDecline
}) => {
  const [hasRead, setHasRead] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAccept = () => {
    if (hasRead && hasAgreed) {
      onAccept();
    }
  };

  const canAccept = hasRead && hasAgreed;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-semibold">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
            Important Disclaimer & Terms of Use
          </DialogTitle>
          <DialogDescription className="text-base">
            Please read and accept the following disclaimer before using NeuroChat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-64 w-full border rounded-md p-4 bg-gray-50">
          <div className="text-sm leading-relaxed space-y-4">
            {DISCLAIMER_TEXT.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700">
                {paragraph}
              </p>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasRead"
              checked={hasRead}
              onCheckedChange={(checked) => setHasRead(checked as boolean)}
            />
            <label
              htmlFor="hasRead"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and understood the disclaimer above
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAgreed"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
            />
            <label
              htmlFor="hasAgreed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the terms and acknowledge that this platform does not provide medical or therapeutic services
            </label>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onDecline}
            className="hover:bg-red-50 hover:text-red-600"
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!canAccept}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DISCLAIMER_TEXT };
export default DisclaimerModal;
