import { Button, Stack, Title, Text, Anchor, Divider, ScrollArea } from '@mantine/core';

interface AttributionsScreenProps {
  onBack: () => void;
}

const ATTRIBUTIONS = [
  { name: 'Fork', author: 'Poly by Google', url: 'https://poly.pizza/m/7vtKzaxldDe' },
  { name: 'Spoon', author: 'Poly by Google', url: 'https://poly.pizza/m/033oz72pFx8' },
  { name: 'Butter Knife', author: 'Poly by Google', url: 'https://poly.pizza/m/3SO0hK17EQW' },
  { name: 'Mug', author: 'Poly by Google', url: 'https://poly.pizza/m/2jVUdnj4mVP' },
  { name: 'Plate', author: 'Poly by Google', url: 'https://poly.pizza/m/9RpiicivMJi' },
  { name: 'Pretzel', author: 'Poly by Google', url: 'https://poly.pizza/m/9FPF7CPKf7M' },
  { name: 'Donut', author: 'Poly by Google', url: 'https://poly.pizza/m/7_-6fUJOawi' },
  { name: 'Glass', author: 'Poly by Google', url: 'https://poly.pizza/m/9i3zPpFEIf3' },
  { name: 'Croissant', author: 'Isa Lousberg', url: 'https://poly.pizza/m/PqyYJqkvPL', ccby: false },
  { name: 'Cheeseburger', author: 'Poly by Google', url: 'https://poly.pizza/m/eke7qcu_FR2' },
  { name: 'Cheese', author: 'Poly by Google', url: 'https://poly.pizza/m/4DecLEjZUrg' },
  { name: 'Apple', author: 'Poly by Google', url: 'https://poly.pizza/m/9cFoY7E-8mu' },
  { name: 'Toaster', author: 'Poly by Google', url: 'https://poly.pizza/m/3Yk9X7TB4KZ' },
  { name: 'Toast', author: 'Poly by Google', url: 'https://poly.pizza/m/0G8E44GGlY_' },
  { name: 'Cauliflower', author: 'Jarlan Perez', url: 'https://poly.pizza/m/1ZJU9Aue5VY' },
  { name: 'Broccoli', author: 'Jarlan Perez', url: 'https://poly.pizza/m/bCmu5O24_Jv' },
  { name: 'Bowl', author: 'Poly by Google', url: 'https://poly.pizza/m/1EwfmPQ-8ur' },
  { name: 'Banana', author: 'Poly by Google', url: 'https://poly.pizza/m/ahOO6wz8sV0' },
  { name: 'Pizza Slice', author: 'Quaternius', url: 'https://poly.pizza/m/CA4HtaaMJn', ccby: false },
];

export function AttributionsScreen({ onBack }: AttributionsScreenProps) {
  return (
    <div className="screen attributions">
      <div className="menu-content">
        <Title order={2} mb="xs">Attributions</Title>
        <Text c="dimmed" mb="md" size="sm">
          Thank you to the artists who made their 3D models freely available. Kitchen Grand Prix
          would not look nearly as delicious without them!
        </Text>
        <Divider mb="md" />
        <ScrollArea h={380} mb="md">
          <Stack gap="xs">
            {ATTRIBUTIONS.map(({ name, author, url, ccby }) => (
              <Text key={name} size="sm">
                <Text span fw={600}>{name}</Text>
                {' — '}
                <Anchor href={url} target="_blank" rel="noopener noreferrer">{author}</Anchor>
                {ccby !== false && (
                  <Text span c="dimmed">
                    {' '}
                    <Anchor
                      href="https://creativecommons.org/licenses/by/3.0/"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="dimmed"
                      size="xs"
                    >
                      [CC-BY]
                    </Anchor>
                    {' via '}
                    <Anchor
                      href="https://poly.pizza"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="dimmed"
                      size="xs"
                    >
                      Poly Pizza
                    </Anchor>
                  </Text>
                )}
              </Text>
            ))}
          </Stack>
        </ScrollArea>
        <Button variant="default" onClick={onBack}>Back</Button>
      </div>
    </div>
  );
}
